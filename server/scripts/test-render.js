/**
 * test-render.js — Test manuale del renderer Puppeteer.
 *
 * Genera le 4 varianti card (Podium, MVP, Ballon d'Or, Golden Boot)
 * usando MOCK data, le salva in server/public/awards/test/<variant>/{story,square,thumb}.png
 * BYPASSANDO il database (non serve un Award reale in Mongo).
 *
 * Uso:
 *   node scripts/test-render.js
 *
 * Output atteso: 12 PNG (4 varianti × 3 size) in server/public/awards/test/
 */

require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const puppeteer = require('puppeteer');
const sharp = require('sharp');

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:8080').replace(/\/+$/, '');
const OUT_DIR = path.join(__dirname, '..', 'public', 'awards', 'test');

const CARD_W = 1080;
const CARD_H = 1920;
const SQUARE = 1080;
const THUMB_W = 240;
const THUMB_H = 426;

const VARIANTS = {
    podium: {
        type: 'MATCH_RECAP',
        shareUrl: `${FRONTEND_URL}/c/test-podium`,
        payload: {
            period: { label: '16 Maggio 2026', dateFrom: '2026-05-16T00:00:00Z' },
            podium: [
                { name: 'MARCO', avg: 8.7 },
                { name: 'LUCA', avg: 8.2 },
                { name: 'GIULIA', avg: 7.9 },
            ],
            highlights: [
                { code: 'STREAK_MVP', text: ['3a PARTITA MVP DI FILA', 'PER MARCO'] },
                { code: 'BEST_BY_MILES', text: ['9/10 HANNO VOTATO', 'OTTIMA AFFLUENZA'] },
            ],
        },
    },
    mvp: {
        type: 'MONTHLY_MVP',
        shareUrl: `${FRONTEND_URL}/c/test-mvp`,
        payload: {
            period: { label: 'MAGGIO 2026' },
            hero: {
                name: 'MARCO', mainValue: '8.4', mainLabel: 'MEDIA VOTO · MAGGIO',
                stats: [
                    { value: '12', label: 'PARTITE GIOCATE' },
                    { value: '5', label: 'VOLTE MVP' },
                    { value: '9.1', label: 'VOTO PIÙ ALTO' },
                    { value: '91%', label: 'PARTECIPAZIONE' },
                ],
            },
        },
    },
    ballon: {
        type: 'BALLON_DOR',
        shareUrl: `${FRONTEND_URL}/c/test-ballon`,
        payload: {
            period: { label: 'STAGIONE 2025/26' },
            hero: {
                name: 'LUCA', mainValue: '8.1', mainLabel: 'MEDIA STAGIONALE',
                stats: [
                    { value: '38', label: 'PARTITE GIOCATE' },
                    { value: '14', label: 'VOLTE MVP' },
                    { value: '9.4', label: 'VOTO PIÙ ALTO' },
                    { value: '95%', label: 'PARTECIPAZIONE' },
                ],
            },
        },
    },
    boot: {
        type: 'GOLDEN_BOOT',
        shareUrl: `${FRONTEND_URL}/c/test-boot`,
        payload: {
            period: { label: 'STAGIONE 2025/26' },
            hero: {
                name: 'GIULIA', mainValue: '24', mainLabel: 'GOL IN STAGIONE',
                stats: [
                    { value: '34', label: 'PARTITE GIOCATE' },
                    { value: '0.71', label: 'GOL A PARTITA' },
                    { value: '4', label: 'TRIPLETTE' },
                    { value: '11', label: 'ASSIST' },
                ],
            },
        },
    },
};

(async () => {
    console.log('🚀 Avvio Chromium headless...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
    });

    for (const [name, data] of Object.entries(VARIANTS)) {
        const t0 = Date.now();
        console.log(`\n📸 [${name}] render...`);

        const dir = path.join(OUT_DIR, name);
        await fs.mkdir(dir, { recursive: true });

        const b64 = Buffer.from(JSON.stringify(data), 'utf8').toString('base64');
        const url = `${FRONTEND_URL}/render-card?payload=${encodeURIComponent(b64)}`;

        const page = await browser.newPage();
        await page.setViewport({ width: CARD_W, height: CARD_H, deviceScaleFactor: 1 });

        try {
            await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });
            await page.waitForFunction(() => window.__RENDER_READY__ === true, { timeout: 15000 });

            const pageError = await page.evaluate(() => window.__RENDER_ERROR__ || null);
            if (pageError) throw new Error(`Errore pagina: ${pageError}`);

            const el = await page.$('[data-render-card]');
            if (!el) throw new Error('Nodo [data-render-card] mancante');

            const story = await el.screenshot({ type: 'png' });
            await fs.writeFile(path.join(dir, 'story.png'), story);

            // Varianti
            const square = await sharp(story)
                .extract({ left: 0, top: Math.round((CARD_H - SQUARE) / 2), width: CARD_W, height: SQUARE })
                .png()
                .toBuffer();
            await fs.writeFile(path.join(dir, 'square.png'), square);

            const thumb = await sharp(story).resize(THUMB_W, THUMB_H, { fit: 'fill' }).png().toBuffer();
            await fs.writeFile(path.join(dir, 'thumb.png'), thumb);

            console.log(`✅ [${name}] done in ${Date.now() - t0}ms → ${dir}`);
        } catch (err) {
            console.error(`❌ [${name}] ${err.message}`);
        } finally {
            await page.close();
        }
    }

    await browser.close();
    console.log('\n🏁 Test completato. Apri server/public/awards/test/ per vedere i PNG.');
})().catch(err => {
    console.error('FATAL:', err);
    process.exit(1);
});
