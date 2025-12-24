/**
 * ⚽ POSITION WEIGHTS SYSTEM
 * 
 * Sistema di calcolo overall rating basato sulla posizione del giocatore.
 * Invece di una semplice media, applica pesi diversi agli attributi in base 
 * alla zona di campo, premiando le caratteristiche più importanti per ogni ruolo.
 * 
 * 🎯 FILOSOFIA:
 * - Un attaccante eccellente nel finalizzare ma debole nel contrasto deve avere 
 *   un rating che riflette i suoi punti di forza
 * - Un difensore forte negli intercetti e contrasti deve essere valutato 
 *   principalmente su questi aspetti
 * - I centrocampisti necessitano di una valutazione bilanciata su tecnica e passaggio
 * 
 * 🗺️ SISTEMA A ZONE:
 * I 13 ruoli specifici vengono raggruppati in 4 zone campo con logiche simili:
 * - DIF (Difesa): DC, TS, TD
 * - CEN (Centrocampo): CC, CDC, COC, ES, ED  
 * - ATT (Attacco): AT, AD, AS, ATT
 * - POR (Portiere): Usa sistema separato con attributi GK
 */

// 🗺️ MAPPATURA RUOLI SPECIFICI → ZONE CAMPO
const POSITION_ZONES = {
    // Portiere - Sistema separato con attributi specializzati
    'POR': 'POR',

    // DIFENSORI - Focus su solidità difensiva e costruzione dal basso
    'DC': 'DIF',    // Difensore Centrale
    'TS': 'DIF',    // Terzino Sinistro
    'TD': 'DIF',    // Terzino Destro

    // CENTROCAMPISTI - Equilibrio tra tecnica, visione e versatilità
    'CC': 'CEN',    // Centrocampista Centrale
    'CDC': 'CEN',   // Centrocampista Difensivo Centrale
    'COC': 'CEN',   // Centrocampista Offensivo Centrale
    'ES': 'CEN',    // Esterno Sinistro
    'ED': 'CEN',    // Esterno Destro

    // ATTACCANTI - Massima enfasi su finalizzazione e creatività offensiva
    'AT': 'ATT',    // Attaccante
    'AD': 'ATT',    // Attaccante Destro
    'AS': 'ATT',    // Attaccante Sinistro
    'ATT': 'ATT'    // Attaccante (generico)
};

// ⚖️ PESI PER ZONA CAMPO
// I valori rappresentano moltiplicatori: >1.0 = boost, <1.0 = penalità
const ZONE_WEIGHTS = {

    // 🛡️ DIFENSORI - "Il muro che costruisce"
    // Priorità: solidità difensiva, fisicità, precisione nei passaggi
    'DIF': {
        // ATTRIBUTI CHIAVE - Boost significativo
        con: 1.8,   // Contrasto - Fondamentale per recuperi palla
        int: 1.8,   // Intercettazione - Lettura del gioco difensivo
        prt: 4.5,   // Precisione di testa - Duelli aerei e corner
        res: 1.9,   // Resistenza - Corsa per 90 minuti
        for: 1.5,   // Forza - Duelli fisici e contrasti

        // ATTRIBUTI UTILI - Leggero boost
        pas: 1.3,   // Passaggio - Costruzione dal basso
        vis: 1.0,   // Visione - Importante ma non prioritaria

        // ATTRIBUTI SECONDARI - Penalizzati
        dri: 0.7,   // Dribbling - Meno rilevante per difensori
        tir: 0.6,   // Tiro - Non è il loro compito principale
        fin: 0.5    // Finalizzazione - Raramente vanno in porta
    },

    // ⚽ CENTROCAMPISTI - "Il cervello del gioco"
    // Priorità: tecnica, visione, capacità di dettare i tempi
    'CEN': {
        // ATTRIBUTI CHIAVE - Boost massimo per la tecnica
        pas: 3.8,   // Passaggio - L'essenza del centrocampista
        vis: 3.8,   // Visione - Leggere il gioco e creare opportunità
        dri: 5.5,   // Dribbling - Superare la pressione avversaria

        // ATTRIBUTI OFFENSIVI - Boost importante
        tir: 3.2,   // Tiro - Inserimenti e conclusioni dalla distanza
        fin: 3.0,   // Finalizzazione - Capitalizzare le occasioni create

        // ATTRIBUTI FISICI - Neutrali
        res: 1.2,   // Resistenza - Corrono più di tutti
        for: 1.0,   // Forza - Importante ma non prioritaria
        prt: 0.8,   // Precisione di testa - Utile ma non fondamentale

        // ATTRIBUTI DIFENSIVI - Fortemente penalizzati
        con: 0.08,  // Contrasto - Non è il loro ruolo primario
        int: 0.08   // Intercettazione - Altri devono difendere
    },

    // 🎯 ATTACCANTI - "La lama che taglia"
    // Priorità: finalizzazione, creatività offensiva, imprevedibilità
    'ATT': {
        // ATTRIBUTI CHIAVE - Boost estremo per l'attacco
        fin: 4.0,   // Finalizzazione - Il loro compito principale
        dri: 3.5,   // Dribbling - Superare i difensori nell'ultimo terzo
        tir: 3.5,   // Tiro - Precisione e potenza in porta

        // ATTRIBUTI CREATIVI - Boost importante
        vis: 2.8,   // Visione - Vedere spazi e creare occasioni
        pas: 2.0,   // Passaggio - Assist e gioco di sponda

        // ATTRIBUTI FISICI - Neutri/leggera penalità
        res: 1.0,   // Resistenza - Importante ma non prioritaria
        for: 0.8,   // Forza - Utile ma non essenziale
        prt: 0.6,   // Precisione di testa - Per alcuni tipi di attaccante

        // ATTRIBUTI DIFENSIVI - Penalizzazione massima
        con: 0.05,  // Contrasto - Non è assolutamente il loro compito
        int: 0.05   // Intercettazione - Devono attaccare, non difendere
    }
};

/**
 * Ottiene la zona campo da una posizione specifica
 * @param {string} position - Posizione giocatore (es: 'CDC', 'TD', 'AT')
 * @returns {string} Zona campo ('DIF', 'CEN', 'ATT', 'POR')
 */
function getZoneFromPosition(position) {
    if (!position) return 'CEN'; // Default per posizioni sconosciute
    return POSITION_ZONES[position] || 'CEN';
}

/**
 * Ottiene i pesi per una zona campo specifica
 * @param {string} zone - Zona campo ('DIF', 'CEN', 'ATT', 'POR')
 * @returns {Object} Oggetto con pesi per ogni attributo
 */
function getWeightsForZone(zone) {
    if (zone === 'POR') {
        // I portieri non usano questo sistema, hanno i loro attributi specifici
        return null;
    }
    return ZONE_WEIGHTS[zone] || ZONE_WEIGHTS['CEN'];
}

module.exports = {
    POSITION_ZONES,
    ZONE_WEIGHTS,
    getZoneFromPosition,
    getWeightsForZone
};