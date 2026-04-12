/**
 * 📋 What's New - Dati delle novità
 * 
 * Per aggiungere una nuova release, aggiungi un oggetto in cima all'array.
 * Il componente WhatsNewModal mostrerà automaticamente solo le novità
 * non ancora viste dall'utente (basato sull'id più alto).
 * 
 * Tipi disponibili per gli items:
 * - "feature"     → Nuova funzionalità (verde, icona sparkle)
 * - "improvement" → Miglioramento (blu, icona trending up)
 * - "fix"         → Bug fix (rosso, icona wrench)
 */

export interface WhatsNewItem {
    type: "feature" | "improvement" | "fix";
    text: string;
}

export interface WhatsNewRelease {
    /** ID incrementale — deve essere unico e crescente */
    id: number;
    /** Data release in formato leggibile */
    date: string;
    /** Titolo della release */
    title: string;
    /** Lista delle novità */
    items: WhatsNewItem[];
}

// 🆕 Aggiungi nuove release IN CIMA all'array (id più alto = più recente)
export const whatsNewReleases: WhatsNewRelease[] = [
    {
        id: 1,
        date: "12 Aprile 2026",
        title: "Aggiornamento del Pesce d'Aprile (ritardato ma più gustoso) 🐟🎉",
        items: [
            { type: "feature", text: "Finalmente puoi modificare il tuo voto! Hai sbagliato a votare? Niente panico, ora puoi correggere prima che il team ti mandi in panchina 😅" },
            { type: "feature", text: "Nuove statistiche: media gol a partita e media assist a partita! Ora puoi dimostrare (o scoprire) quanto sei davvero decisivo ⚽📊" },
            { type: "improvement", text: "Pagina di votazione semplificata! Ora inserisci solo i tuoi gol e assist. Se un compagno non ha votato, puoi aggiungere i suoi — e se più persone lo fanno, i valori vengono mediati. Meno confusione, più fair play! 🤝" },
        ],
    },
];

/** Restituisce la release più recente (quella con id più alto) */
export function getLatestRelease(): WhatsNewRelease | undefined {
    return whatsNewReleases.length > 0
        ? whatsNewReleases.reduce((a, b) => (a.id > b.id ? a : b))
        : undefined;
}

/** Restituisce tutte le release non viste dall'utente (con id > lastSeenId) */
export function getUnseenReleases(lastSeenId: number): WhatsNewRelease[] {
    return whatsNewReleases
        .filter((r) => r.id > lastSeenId)
        .sort((a, b) => b.id - a.id);
}
