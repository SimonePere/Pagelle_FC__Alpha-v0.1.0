/**
 * 🎬 demoMode — Rende interattiva la modalità demo senza scrivere mai sul server.
 *
 * IL PROBLEMA CHE RISOLVE
 *   Il backend respinge ogni scrittura fatta con un token demo (middleware
 *   blockDemoWrites). Giusto così: è la barriera di sicurezza. Ma se il client
 *   si limitasse a inoltrare le richieste, il visitatore vedrebbe un errore
 *   rosso ogni volta che prova a votare — e la demo diventerebbe una vetrina
 *   morta invece di qualcosa da provare.
 *
 *   Questo modulo intercetta le scritture PRIMA che partano e restituisce una
 *   risposta verosimile. Il visitatore vota, vede il risultato, riceve un toast
 *   che gli ricorda che è una demo. Nulla raggiunge il database.
 *
 * LE DUE BARRIERE SONO INDIPENDENTI
 *   Client → esperienza.  Server → sicurezza.
 *   Nessuna delle due si fida dell'altra. Se questo file avesse un buco, il
 *   server risponderebbe comunque 403; se il server fosse permissivo, il client
 *   non manderebbe comunque la richiesta.
 *
 * Vedi DEMO_MODE_IMPLEMENTATION_PLAN.md §B.2
 */

// ═══════════════════════════════════════════════════════════════════════════
// RILEVAMENTO DELLA MODALITÀ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * La modalità demo si legge dal JWT, non dallo stato Redux.
 *
 * Il motivo: `apiCall` è una funzione pura, chiamata anche fuori dal ciclo di
 * vita dei componenti. Farle leggere lo store creerebbe una dipendenza
 * circolare (store → slice → api → store). Il token in localStorage è la
 * stessa fonte da cui parte `initializeAuth`, quindi le due letture non
 * possono divergere.
 */
export function isDemoActive(): boolean {
    try {
        const token = localStorage.getItem('token');
        if (!token) return false;
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload?.scope === 'demo';
    } catch {
        return false;
    }
}

export function getDemoTeamId(): string | null {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload?.scope === 'demo' ? (payload.teamId ?? null) : null;
    } catch {
        return null;
    }
}

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Rotte di SESSIONE, che devono raggiungere il server anche in demo.
 *
 * Sono scritture, ma non toccano i dati della squadra dimostrativa: servono a
 * entrare nella demo o — soprattutto — a uscirne registrandosi. Intercettarle
 * qui significherebbe impedire al visitatore di creare il suo account, che è
 * esattamente lo scopo di tutta la modalità demo.
 *
 * Deve restare allineata a SESSION_ROUTES in server/src/middleware/blockDemoWrites.js
 */
const SESSION_ROUTES = ['/auth/login', '/auth/register', '/auth/demo-login'];

function isSessionRoute(endpoint: string): boolean {
    const path = endpoint.split('?')[0].replace(/\/+$/, '');
    return SESSION_ROUTES.includes(path);
}

export function shouldIntercept(endpoint: string, method: string): boolean {
    if (!isDemoActive()) return false;
    if (!WRITE_METHODS.includes(method.toUpperCase())) return false;
    return !isSessionRoute(endpoint);
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICA ALL'INTERFACCIA
// ═══════════════════════════════════════════════════════════════════════════

export interface DemoActionEvent {
    /** Messaggio già pronto per l'utente, in italiano. */
    message: string;
    /** Endpoint intercettato — utile in sviluppo, non mostrato all'utente. */
    endpoint: string;
    method: string;
}

export const DEMO_ACTION_EVENT = 'pagellefc:demo-action';

/**
 * L'intercettore non può mostrare toast da sé: è un modulo, non un componente.
 * Emette un evento che DemoBanner ascolta. Così il feedback resta in un punto
 * solo dell'interfaccia e non serve passare callback attraverso mezza app.
 */
function announce(detail: DemoActionEvent) {
    try {
        window.dispatchEvent(new CustomEvent(DEMO_ACTION_EVENT, { detail }));
    } catch {
        // Ambienti senza window (test, SSR): l'azione resta comunque simulata.
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SIMULAZIONE DELLE SCRITTURE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ogni voce descrive come reagire a una scrittura intercettata.
 * `match` riceve l'endpoint senza query string.
 */
interface DemoRule {
    match: (endpoint: string, method: string) => boolean;
    message: string;
    /** Risposta simulata. Deve avere la FORMA che il chiamante si aspetta. */
    respond: (endpoint: string, body: any) => any;
}

const nowIso = () => new Date().toISOString();

/** Id riconoscibile a colpo d'occhio nei log e nel Redux DevTools. */
const demoId = (prefix: string) =>
    `demo-${prefix}-${Date.now().toString(36)}`;

/**
 * ⚠️ La forma delle risposte è la parte delicata di questo file.
 *
 * Se una risposta simulata non ha la stessa struttura di quella vera, il
 * reducer che la riceve va in errore e il visitatore vede una schermata rotta
 * — peggio che se l'azione fosse stata bloccata. Le forme qui sotto sono
 * ricalcate su quelle reali dei rispettivi thunk in redux/slices/.
 */
const RULES: DemoRule[] = [
    // ── Voto partita ──────────────────────────────────────────────────────
    // È l'azione più importante della demo: è il momento in cui il visitatore
    // smette di guardare e partecipa.
    {
        match: (e, m) => /^\/voting-sessions\/[^/]+\/vote$/.test(e) && (m === 'POST' || m === 'PATCH'),
        message: 'Voto registrato! In demo però non viene salvato — crea il tuo team per farlo sul serio.',
        respond: (_e, body) => ({
            success: true,
            message: 'Voto registrato (demo)',
            submission: {
                _id: demoId('vote'),
                voteData: body?.voteData ?? body ?? {},
                createdAt: nowIso(),
                isActive: true,
            },
        }),
    },

    // ── Player card ───────────────────────────────────────────────────────
    {
        match: (e, m) => /^\/player-cards\/sessions\/[^/]+\/vote$/.test(e) && m === 'POST',
        message: 'Valutazione inviata! In demo non viene salvata.',
        respond: (_e, body) => ({
            success: true,
            message: 'Valutazione registrata (demo)',
            submission: {
                _id: demoId('card'),
                attributes: body?.attributes ?? {},
                additionalAttributes: body?.additionalAttributes ?? {},
                createdAt: nowIso(),
                isActive: true,
            },
        }),
    },

    // ── Creazione partita ─────────────────────────────────────────────────
    {
        match: (e, m) => e === '/matches' && m === 'POST',
        message: 'Partita creata! Esiste solo in questa demo e sparirà al prossimo caricamento.',
        respond: (_e, body) => ({
            success: true,
            message: 'Partita creata (demo)',
            match: {
                _id: demoId('match'),
                id: demoId('match'),
                ...body,
                status: 'active',
                createdAt: nowIso(),
                finalResults: { teamGoals: 0, opponentGoals: 0 },
            },
        }),
    },

    // ── Invito ospiti ─────────────────────────────────────────────────────
    // Il flusso si percorre tutto, fino al link. Ma il token è visibilmente
    // finto: mostrare un link che sembra valido e non lo è sarebbe peggio che
    // dire chiaramente come stanno le cose.
    {
        match: (e, m) => /^\/matches\/[^/]+\/guest-players$/.test(e) && m === 'POST',
        message: 'In demo l\'invito non viene inviato davvero — con un account reale il tuo compagno riceverebbe il link.',
        respond: (_e, body) => ({
            success: true,
            message: 'Ospite aggiunto (demo)',
            guest: {
                _id: demoId('guest'),
                name: body?.name ?? 'Ospite',
                isGuest: true,
                inviteToken: 'demo-invito-non-attivo',
                inviteUrl: `${window.location.origin}/join?token=demo-invito-non-attivo`,
            },
        }),
    },

    // ── Profilo ───────────────────────────────────────────────────────────
    {
        match: (e, m) => e === '/auth/profile' && m === 'PUT',
        message: 'In demo il profilo non è modificabile.',
        respond: () => ({
            success: false,
            message: 'Profilo non modificabile in modalità demo',
        }),
    },

    // ── Cancellazioni ─────────────────────────────────────────────────────
    // Il visitatore entra come capitano, quindi l'interfaccia gli mostra anche
    // i pulsanti di eliminazione. Vanno intercettati tutti.
    {
        match: (_e, m) => m === 'DELETE',
        message: 'In demo non si può eliminare nulla.',
        respond: () => ({ success: true, message: 'Eliminato (demo)' }),
    },
];

/** Regola di riserva: qualunque scrittura non prevista sopra. */
const FALLBACK: DemoRule = {
    match: () => true,
    message: 'Sei in modalità demo: le modifiche non vengono salvate.',
    respond: () => ({ success: true, message: 'Azione simulata (demo)' }),
};

/**
 * Intercetta una scrittura e restituisce la risposta simulata.
 * Da chiamare solo dopo che `shouldIntercept` ha detto di sì.
 */
export function simulateWrite(endpoint: string, method: string, body?: any): any {
    const path = endpoint.split('?')[0];
    const verb = method.toUpperCase();

    const rule = RULES.find(r => r.match(path, verb)) ?? FALLBACK;

    announce({ message: rule.message, endpoint: path, method: verb });

    if (import.meta.env.DEV) {
        console.info(`🎬 [demo] ${verb} ${path} — intercettata, nessuna chiamata al server`);
    }

    return rule.respond(path, body);
}
