/**
 * renderAward.js — Renderer Puppeteer pixel-perfect.
 *
 * Flusso:
 *  1. Riceve l'Award appena creato (status PENDING).
 *  2. Codifica il payload in base64 e lo passa come query string a /render-card.
 *  3. Lancia (o riusa) un browser Chromium headless.
 *  4. Apre la pagina React di rendering, aspetta `window.__RENDER_READY__`.
 *  5. Fa screenshot del nodo `[data-render-card]` (1080×1920 PNG).
 *  6. Genera le varianti square (1080×1080 crop centrato verticalmente) e thumb (240×426)
 *     usando sharp.
 *  7. Upload delle 3 immagini (Cloudinary o filesystem locale).
 *  8. Aggiorna l'Award nel DB: imageUrl, imageSquareUrl, imageThumbUrl, shareUrl,
 *     status='READY', finalizedAt.
 *
 * Robustezza:
 *  - Browser singleton: una sola istanza di Chromium riutilizzata fra render
 *    (evita ~1.5s di startup per ogni card). Si auto-chiude alla shutdown.
 *  - Page-per-render: ogni render usa una nuova pagina e la chiude (no leak di tab).
 *  - Errori → award.status='FAILED' + error.message su `award.error.message`.
 *  - Timeout difensivi: navigation 20s, render-ready 15s.
 */

const puppeteer = require('puppeteer');
const sharp = require('sharp');
const { uploadAwardImages } = require('./upload');
const Award = require('../models/Award');

// === Costanti dimensioni ===
const CARD_W = 1080;
const CARD_H = 1920;
const SQUARE_SIZE = 1080;
const THUMB_W = 240;
const THUMB_H = 426;

// === Browser singleton (lazy) ===
let _browser = null;
let _browserStarting = null;

async function getBrowser() {
    if (_browser && _browser.connected) return _browser;
    // Se già in fase di avvio, riusa la promise (evita race con avvii paralleli)
    if (_browserStarting) return _browserStarting;

    _browserStarting = puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // utile in container (Railway/Render)
            '--font-render-hinting=none', // rendering font più consistente
        ],
    }).then(b => {
        _browser = b;
        _browserStarting = null;
        // Se il processo crash-a, resetta
        b.on('disconnected', () => { _browser = null; });
        return b;
    }).catch(err => {
        _browserStarting = null;
        throw err;
    });

    return _browserStarting;
}

/** Chiude il browser (chiamare a shutdown del server). */
async function closeBrowser() {
    if (_browser) {
        try { await _browser.close(); } catch { /* ignore */ }
        _browser = null;
    }
}

/**
 * Render + upload + persist per un singolo Award.
 *
 * @param {Object} award — documento Mongoose Award (o oggetto plain con _id, type, payload)
 * @returns {Promise<{ storyUrl: string, squareUrl: string, thumbUrl: string }>}
 */
async function renderAndUpload(award) {
    const awardId = String(award._id);
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:8080').replace(/\/+$/, '');
    const shareUrl = `${frontendUrl}/c/${awardId}`;

    let page = null;
    try {
        // Payload self-contained passato via query (no fetch lato browser)
        const payloadJson = JSON.stringify({
            type: award.type,
            payload: award.payload,
            shareUrl,
        });
        const payloadB64 = Buffer.from(payloadJson, 'utf8').toString('base64');
        const url = `${frontendUrl}/render-card?payload=${encodeURIComponent(payloadB64)}`;

        const browser = await getBrowser();
        page = await browser.newPage();

        // Viewport esattamente come la card. deviceScaleFactor=1 perché vogliamo 1080×1920 reali.
        await page.setViewport({
            width: CARD_W,
            height: CARD_H,
            deviceScaleFactor: 1,
        });

        await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });

        // Aspetta il segnale di "render completo" emesso dal componente RenderCard
        await page.waitForFunction(
            () => window.__RENDER_READY__ === true,
            { timeout: 15000 }
        );

        // Controllo errore lato pagina
        const pageError = await page.evaluate(() => window.__RENDER_ERROR__ || null);
        if (pageError) {
            throw new Error(`Errore pagina render: ${pageError}`);
        }

        // Screenshot dell'elemento card (1080×1920)
        const cardEl = await page.$('[data-render-card]');
        if (!cardEl) throw new Error('Elemento [data-render-card] non trovato in pagina');
        const storyBuffer = await cardEl.screenshot({
            type: 'png',
            omitBackground: false, // mantieni eventuale sfondo della card
        });

        await page.close();
        page = null;

        // Varianti via sharp
        // - square 1080×1080: crop centrato verticalmente
        // - thumb 240×426: resize completo della story
        const squareTop = Math.round((CARD_H - SQUARE_SIZE) / 2);
        const [squareBuffer, thumbBuffer] = await Promise.all([
            sharp(storyBuffer)
                .extract({ left: 0, top: squareTop, width: CARD_W, height: SQUARE_SIZE })
                .png()
                .toBuffer(),
            sharp(storyBuffer)
                .resize(THUMB_W, THUMB_H, { fit: 'fill' })
                .png()
                .toBuffer(),
        ]);

        // Upload (Cloudinary o local fallback)
        const urls = await uploadAwardImages(awardId, {
            story: storyBuffer,
            square: squareBuffer,
            thumb: thumbBuffer,
        });

        // Persist su DB
        await Award.findByIdAndUpdate(awardId, {
            imageUrl: urls.storyUrl,
            imageSquareUrl: urls.squareUrl,
            imageThumbUrl: urls.thumbUrl,
            shareUrl,
            status: 'READY',
            finalizedAt: new Date(),
        });

        return urls;
    } catch (err) {
        // Marca FAILED e registra errore (non rilancia: è chiamato fire-and-forget)
        try {
            await Award.findByIdAndUpdate(awardId, {
                status: 'FAILED',
                lastError: err.message,
                $inc: { generationAttempts: 1 },
            });
        } catch { /* ignore secondary error */ }
        // Comunque rilancia: il chiamante in AwardService logga
        throw err;
    } finally {
        if (page) {
            try { await page.close(); } catch { /* ignore */ }
        }
    }
}

// Cleanup ordinato del browser allo shutdown del processo
process.on('SIGINT', () => { closeBrowser().finally(() => process.exit(0)); });
process.on('SIGTERM', () => { closeBrowser().finally(() => process.exit(0)); });

module.exports = { renderAndUpload, closeBrowser };
