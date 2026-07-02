/**
 * useActiveSeason — gestione stagione selezionata (Fase 5)
 *
 * - Carica la lista stagioni da GET /api/v1/seasons al mount.
 * - Persiste la scelta in localStorage con chiave `season_selected`.
 * - Default: stagione corrente ('current') → il backend la risolve automaticamente.
 * - Espone helpers utili al SeasonSelector e alle pagine che re-fetchano i dati.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Season } from '@/types/season';

const STORAGE_KEY = 'season_selected';

interface UseActiveSeasonReturn {
    seasons: Season[];
    /** Valore per il parametro ?season= dell'API: "YYYY-YY" | "current" | "all" */
    selectedSeason: string;
    setSelectedSeason: (season: string) => void;
    isLoading: boolean;
    /** seasonId della stagione attiva (status = 'active'), se già caricato */
    currentSeasonId: string | undefined;
    /** true se c'è più di una stagione e il selettore va mostrato */
    showSelector: boolean;
}

export function useActiveSeason(): UseActiveSeasonReturn {
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [selectedSeason, setSelectedSeasonState] = useState<string>(() => {
        return localStorage.getItem(STORAGE_KEY) || 'current';
    });

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        api.get('/seasons')
            .then((res: { seasons: Season[] }) => {
                if (cancelled) return;
                const list = res.seasons || [];
                setSeasons(list);

                // Se la stagione salvata non esiste più nella lista, torna alla corrente
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored && stored !== 'current' && stored !== 'all') {
                    const stillValid = list.some(s => s.seasonId === stored);
                    if (!stillValid) {
                        localStorage.removeItem(STORAGE_KEY);
                        setSelectedSeasonState('current');
                    }
                }
            })
            .catch(() => { /* lista vuota → nessun selettore */ })
            .finally(() => { if (!cancelled) setIsLoading(false); });

        return () => { cancelled = true; };
    }, []);

    const setSelectedSeason = useCallback((season: string) => {
        localStorage.setItem(STORAGE_KEY, season);
        setSelectedSeasonState(season);
    }, []);

    const currentSeasonId = seasons.find(s => s.status === 'active')?.seasonId;
    const showSelector = seasons.length > 1;

    return {
        seasons,
        selectedSeason,
        setSelectedSeason,
        isLoading,
        currentSeasonId,
        showSelector,
    };
}
