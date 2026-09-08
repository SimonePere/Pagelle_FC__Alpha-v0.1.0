const jwt = require('jsonwebtoken');

/**
 * blockDemoWrites — Rende la modalità demo strutturalmente read-only.
 *
 * COSA FA
 *   Se la richiesta porta un JWT con scope 'demo', qualsiasi metodo che
 *   modifica stato (POST, PUT, PATCH, DELETE) viene respinto con 403 prima
 *   ancora di raggiungere il router.
 *
 * PERCHÉ ESISTE, VISTO CHE IL CLIENT GIÀ INTERCETTA
 *   Il client simula le scritture per dare al visitatore un'esperienza
 *   interattiva (vota, vede il risultato, riceve il toast). Ma quella è
 *   ESPERIENZA, non SICUREZZA: chiunque apra la console del browser può
 *   aggirarla. Questo middleware è la barriera vera, e non si fida del client.
 *
 * PERCHÉ DECODIFICA IL TOKEN DA SÉ INVECE DI LEGGERE req.user
 *   Il middleware `auth` è montato dentro i singoli router, quindi req.user
 *   non è ancora popolato a livello di app. Decodificando il JWT in proprio,
 *   questo middleware può stare montato UNA VOLTA su /api/v1 e coprire ogni
 *   rotta — comprese quelle che un domani dimenticassero `auth`.
 *   Non tocca il database: gli basta il payload del token.
 *
 * COSA NON FA
 *   Non autentica e non respinge i token invalidi: se la verifica fallisce
 *   lascia proseguire, e sarà `auth` a rispondere 401 dove serve. Qui
 *   l'unica domanda è "questo token è demo e sta provando a scrivere?".
 *
 * Vedi DEMO_MODE_IMPLEMENTATION_PLAN.md §A.4
 */

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Rotte di SESSIONE, esentate dal blocco.
 *
 * Sono scritture, ma non toccano i dati della squadra demo: servono a entrare
 * nella demo o — soprattutto — a USCIRNE registrandosi. Senza questa esenzione
 * il visitatore che clicca "Crea il tuo team" con il token demo ancora in
 * localStorage riceverebbe 403 proprio nel momento della conversione, che è
 * esattamente lo scopo di tutta la modalità demo.
 *
 * ⚠️ La lista è volutamente cortissima e va confrontata sul path ESATTO.
 *    Ogni aggiunta qui è una potenziale falla: prima di estenderla, chiedersi
 *    se la rotta può in qualche modo modificare dati del team demo.
 *    In particolare `/auth/profile` NON è esentata: modifica il profilo del
 *    giocatore demo ed è quindi una scrittura a tutti gli effetti.
 */
const SESSION_ROUTES = [
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/auth/demo-login'
];

const blockDemoWrites = (req, res, next) => {
    // Le letture passano sempre: è il caso di gran lunga più frequente,
    // quindi lo sbrighiamo prima di toccare il token.
    if (!WRITE_METHODS.includes(req.method)) return next();

    // Rotte di sessione: consentite anche con un token demo in corso.
    // Confronto sul path senza query string, per non farsi aggirare con "?x=1".
    const path = req.originalUrl.split('?')[0].replace(/\/+$/, '');
    if (SESSION_ROUTES.includes(path)) return next();

    // Se un middleware a monte ha già risolto l'utente, fidiamoci di quello.
    if (req.user?.scope) {
        return req.user.scope === 'demo' ? refuse(req, res) : next();
    }

    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return next();

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded?.scope === 'demo') return refuse(req, res);
    } catch {
        // Token illeggibile o scaduto: non è compito nostro respingerlo.
        // Prosegue e sarà `auth` a rispondere 401.
    }

    return next();
};

function refuse(req, res) {
    console.log(`🎬 [DEMO] Scrittura bloccata: ${req.method} ${req.originalUrl}`);
    return res.status(403).json({
        error: 'DEMO_READ_ONLY',
        message: 'Sei in modalità demo: le modifiche non vengono salvate. Registrati per creare il tuo team!'
    });
}

module.exports = blockDemoWrites;
