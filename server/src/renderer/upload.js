/**
 * upload.js — Upload delle 3 varianti di immagine award.
 *
 * Strategia:
 *  - Se CLOUDINARY_URL (o CLOUDINARY_CLOUD_NAME + API_KEY + API_SECRET) è configurato,
 *    upload su Cloudinary (folder `pagelle-fc/awards/<awardId>/`).
 *  - Altrimenti FALLBACK LOCALE: scrive i PNG su disco in `server/public/awards/<awardId>/`
 *    e ritorna URL del tipo `${PUBLIC_BASE_URL}/awards-static/<awardId>/story.png`.
 *
 * Questo permette di sviluppare/testare senza dover configurare Cloudinary.
 * In produzione (Railway/Render) Cloudinary è la scelta obbligata: i container
 * sono effimeri e perderebbero le immagini scritte a disco.
 */

const fs = require('fs/promises');
const path = require('path');

// === Config Cloudinary (lazy: solo se configurato) ===
let cloudinary = null;
function getCloudinary() {
    if (cloudinary !== null) return cloudinary;
    const hasConfig =
        process.env.CLOUDINARY_URL ||
        (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

    if (!hasConfig) {
        cloudinary = false; // sentinella: non disponibile
        return false;
    }
    const cld = require('cloudinary').v2;
    // CLOUDINARY_URL viene letto automaticamente. Se invece sono settate le 3 vars singole, le applichiamo.
    if (!process.env.CLOUDINARY_URL) {
        cld.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
            secure: true
        });
    }
    cloudinary = cld;
    return cloudinary;
}

// === Path base per fallback locale ===
const LOCAL_DIR = path.join(__dirname, '..', '..', 'public', 'awards');

/**
 * Carica le 3 varianti di un award.
 *
 * @param {string} awardId
 * @param {{ story: Buffer, square: Buffer, thumb: Buffer }} buffers
 * @returns {Promise<{ storyUrl: string, squareUrl: string, thumbUrl: string }>}
 */
async function uploadAwardImages(awardId, buffers) {
    const cld = getCloudinary();

    if (cld) {
        // === Cloudinary ===
        const folder = `pagelle-fc/awards/${awardId}`;
        const [story, square, thumb] = await Promise.all([
            uploadOneCloudinary(cld, buffers.story, folder, 'story'),
            uploadOneCloudinary(cld, buffers.square, folder, 'square'),
            uploadOneCloudinary(cld, buffers.thumb, folder, 'thumb'),
        ]);
        return {
            storyUrl: story.secure_url,
            squareUrl: square.secure_url,
            thumbUrl: thumb.secure_url,
        };
    }

    // === Fallback locale (dev) ===
    const dir = path.join(LOCAL_DIR, String(awardId));
    await fs.mkdir(dir, { recursive: true });

    await Promise.all([
        fs.writeFile(path.join(dir, 'story.png'), buffers.story),
        fs.writeFile(path.join(dir, 'square.png'), buffers.square),
        fs.writeFile(path.join(dir, 'thumb.png'), buffers.thumb),
    ]);

    // URL servito dallo static middleware (vedi app.js → /awards-static)
    const base = (process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/+$/, '');
    return {
        storyUrl: `${base}/awards-static/${awardId}/story.png`,
        squareUrl: `${base}/awards-static/${awardId}/square.png`,
        thumbUrl: `${base}/awards-static/${awardId}/thumb.png`,
    };
}

function uploadOneCloudinary(cld, buffer, folder, publicId) {
    return new Promise((resolve, reject) => {
        const stream = cld.uploader.upload_stream(
            { folder, public_id: publicId, resource_type: 'image', format: 'png', overwrite: true },
            (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(buffer);
    });
}

module.exports = { uploadAwardImages };
