import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store/store';

const STORAGE_KEY = 'activeTeamId';

/**
 * Hook centralizzato per ottenere e cambiare il team attivo.
 * Persiste la scelta in localStorage così sopravvive ai refresh.
 * Fallback: primo team dell'utente.
 */
export function useActiveTeamId() {
    const { user } = useSelector((state: RootState) => state.auth);

    // Lista team dell'utente (enriched shape da /auth/me oppure teamIds da login)
    const userTeams = user?.teams ?? [];
    const teamIds = user?.teamIds ?? [];

    const getActiveTeamId = (): string | undefined => {
        const stored = localStorage.getItem(STORAGE_KEY);
        // Verifica che il team salvato sia ancora tra quelli dell'utente
        if (stored) {
            const isValid = userTeams.some(t => t.id === stored) || teamIds.includes(stored);
            if (isValid) return stored;
        }
        // Fallback: primo team disponibile
        return userTeams[0]?.id || teamIds[0];
    };

    const activeTeamId = getActiveTeamId();
    const activeTeam = userTeams.find(t => t.id === activeTeamId);
    const hasMultipleTeams = userTeams.length > 1 || teamIds.length > 1;

    const setActiveTeamId = useCallback((teamId: string) => {
        localStorage.setItem(STORAGE_KEY, teamId);
        // Force re-render tramite reload dati — il consumer chiamerà window.location.reload()
        // oppure ri-dispatch dei fetch
    }, []);

    return {
        activeTeamId,
        activeTeam,
        userTeams,
        hasMultipleTeams,
        setActiveTeamId,
    };
}
