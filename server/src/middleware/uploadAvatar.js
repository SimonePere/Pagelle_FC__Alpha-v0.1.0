const multer = require('multer');

/**
 * Upload Avatar Middleware — Configura multer per upload di immagini in memoria
 * 
 * - Storage: memory (niente disco, Render è effimero)
 * - File size limit: 200KB (hard cap)
 * - Field name: 'avatar'
 */

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // Whitelist MIME types (ulteriore controllo lato middleware)
    const allowedMimes = ['image/webp', 'image/jpeg', 'image/png'];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: ${allowedMimes.join(', ')}`));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 200000 // 200KB
    }
});

// Middleware che cattura il file 'avatar' singolo
module.exports = upload.single('avatar');
