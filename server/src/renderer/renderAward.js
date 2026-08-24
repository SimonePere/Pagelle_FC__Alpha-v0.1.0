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
    const publicApiBase = (process.env.PUBLIC_API_BASE_URL || '').replace(/\/+$/, '');
    const shareUrl = publicApiBase
        ? `${publicApiBase}/awards/public/${awardId}/share`
        : `${frontendUrl}/c/${awardId}`;

    let page = null;
    try {
        console.info(`[Award] Avvio rendering id=${awardId} type=${award.type}`);

        const browser = await getBrowser();
        page = await browser.newPage();

        // Disabilita Service Worker e cache per evitare reload asincroni di controllerchange / PWA
        try {
            await page.setBypassServiceWorker(true);
            await page.setCacheEnabled(false);
        } catch { /* ignore if not supported */ }

        // Inietta i dati dell'Award direttamente nel contesto della finestra prima dell'esecuzione degli script
        // e disabilita 'serviceWorker' in navigator per prevenire reload automatici (controllerchange)
        await page.evaluateOnNewDocument((data) => {
            window.__AWARD_DATA__ = data;
            try {
                // Mock no-op per il Service Worker: evita reload improvvisi senza lanciare TypeError
                Object.defineProperty(navigator, 'serviceWorker', {
                    get: () => ({
                        addEventListener: () => { },
                        removeEventListener: () => { },
                        register: () => Promise.resolve({
                            installing: null,
                            waiting: null,
                            active: null,
                            addEventListener: () => { },
                            removeEventListener: () => { },
                        }),
                        getRegistration: () => Promise.resolve(undefined),
                        getRegistrations: () => Promise.resolve([]),
                        ready: new Promise(() => { }),
                        controller: null,
                    }),
                    configurable: true,
                });
            } catch { /* ignore */ }
        }, {
            type: award.type,
            payload: award.payload,
            shareUrl,
        });

        // Viewport esattamente come la card. deviceScaleFactor=1 perché vogliamo 1080×1920 reali.
        await page.setViewport({
            width: CARD_W,
            height: CARD_H,
            deviceScaleFactor: 1,
        });

        const url = `${frontendUrl}/render-card`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

        // Aspetta il segnale di "render completo" o di errore emesso dal componente RenderCard
        await page.waitForFunction(
            () => window.__RENDER_READY__ === true || Boolean(window.__RENDER_ERROR__),
            { timeout: 15000 }
        );

        // Controllo eventuale errore emerso lato frontend React
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

        console.info(`[Award] Render completato con successo id=${awardId} type=${award.type} status=READY`);

        return urls;
    } catch (err) {
        console.error(`[Award] Render fallito per id=${awardId}:`, err.message);
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
