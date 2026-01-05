import { useMemo } from 'react';

export interface PlayerSpecialty {
    id: string;
    name: string;
    icon: string;
    color: string;
    description: string;
}

interface PlayerAttributes {
    tir: number;    // Tiro
    pas: number;    // Passaggio
    dri: number;    // Dribbling
    fin: number;    // Finalizzazione
    vis: number;    // Visione
    res: number;    // Resistenza
    for: number;    // Forza
    con: number;    // Contrasto
    int: number;    // Intercettazione
    prt: number;    // Precisione di testa
}

interface GoalkeeperAttributes {
    tf: number;     // Tuffo
    pr: number;     // Presa
    rn: number;     // Rinvio
    pz: number;     // Piazzamento
    rf: number;     // Riflessi
}

/**
 * Hook per calcolare automaticamente le specialità del giocatore
 * basandosi sui valori degli attributi (stile FIFA Player Specialties)
 * 
 * @param finalAttributes - Attributi principali del giocatore
 * @param goalkeeperAttributes - Attributi portiere (opzionali)
 * @returns Array delle specialità ottenute dal giocatore
 */
export const usePlayerSpecialties = (
    finalAttributes: PlayerAttributes,
    goalkeeperAttributes?: GoalkeeperAttributes | null
): PlayerSpecialty[] => {
    return useMemo(() => {
        const specialties: PlayerSpecialty[] = [];

        // ========================
        // 🌟 SPECIALITÀ TECNICHE
        // ========================

        // 🌀 Funambolo - Eccellente nel dribbling
        if (finalAttributes.dri >= 85) {
            specialties.push({
                id: 'funambolo',
                name: 'Funambolo',
                icon: '🌀',
                color: 'purple',
                description: 'Eccellente nel dribbling e nel controllo palla'
            });
        }

        // 🎯 Finalizzatore - Letale sotto porta
        if (finalAttributes.fin >= 85 || finalAttributes.tir >= 80) {
            specialties.push({
                id: 'finalizzatore',
                name: 'Finalizzatore',
                icon: '🎯',
                color: 'red',
                description: 'Letale sotto porta e nei momenti decisivi'
            });
        }

        // 🎯 Specialista colpo di testa - Dominante nel gioco aereo
        if (finalAttributes.prt >= 80 || finalAttributes.for >= 80) {
            specialties.push({
                id: 'specialista-colpo-testa',
                name: 'Specialista colpo di testa',
                icon: '🎯',
                color: 'orange',
                description: 'Dominante nel gioco aereo e sui cross'
            });
        }

        // 🧠 Regista - Orchestratore del gioco
        if (finalAttributes.pas >= 85 || finalAttributes.vis >= 85) {
            specialties.push({
                id: 'regista',
                name: 'Regista',
                icon: '🧠',
                color: 'blue',
                description: 'Orchestratore del gioco e dei ritmi di squadra'
            });
        }

        // ========================
        // 🛡️ SPECIALITÀ DIFENSIVE
        // ========================

        // 🛡️ Difensore arcigno - Invalicabile in difesa
        if (finalAttributes.con >= 85 && finalAttributes.int >= 80) {
            specialties.push({
                id: 'difensore-arcigno',
                name: 'Difensore arcigno',
                icon: '🛡️',
                color: 'green',
                description: 'Invalicabile in difesa, legge sempre il gioco'
            });
        }

        // 🧱 Difensore fisico - Potenza dominante
        if (finalAttributes.for >= 85 && finalAttributes.con >= 80) {
            specialties.push({
                id: 'difensore-fisico',
                name: 'Difensore fisico',
                icon: '🧱',
                color: 'gray',
                description: 'Potenza fisica dominante nei duelli aerei e terrestri'
            });
        }

        // ========================
        // 🏃 SPECIALITÀ FISICHE
        // ========================

        // 🏃 Maratoneta - Resistenza instancabile
        if (finalAttributes.res >= 85) {
            specialties.push({
                id: 'maratoneta',
                name: 'Maratoneta',
                icon: '🏃',
                color: 'yellow',
                description: 'Resistenza instancabile per tutti i 90 minuti'
            });
        }

        // ========================
        // 🧤 SPECIALITÀ PORTIERE
        // ========================

        // Solo se ha attributi portiere validi (non null/undefined)
        if (goalkeeperAttributes &&
            Object.values(goalkeeperAttributes).some(value => value !== null && value !== undefined)) {

            // 🧤 Pararigori - Insuperabile sui penalty
            if (goalkeeperAttributes.tf >= 85 && goalkeeperAttributes.rf >= 85) {
                specialties.push({
                    id: 'pararigori',
                    name: 'Pararigori',
                    icon: '🧤',
                    color: 'cyan',
                    description: 'Insuperabile sui tiri dal dischetto e nelle parate spettacolari'
                });
            }

            // 🧤 Portiere affidabile - Sicurezza tra i pali
            if (goalkeeperAttributes.pz >= 85 && goalkeeperAttributes.pr >= 80) {
                specialties.push({
                    id: 'portiere-affidabile',
                    name: 'Portiere affidabile',
                    icon: '🧤',
                    color: 'indigo',
                    description: 'Sicurezza assoluta tra i pali, mai fuori posizione'
                });
            }

            // 🧤 Portiere fuori dai pali - Libero aggiunto
            if (goalkeeperAttributes.rf >= 85 && goalkeeperAttributes.rn >= 85) {
                specialties.push({
                    id: 'portiere-fuori-pali',
                    name: 'Portiere fuori dai pali',
                    icon: '🧤',
                    color: 'pink',
                    description: 'Libero aggiunto in difesa, ottima costruzione dal basso'
                });
            }
        }

        return specialties;
    }, [finalAttributes, goalkeeperAttributes]);
};