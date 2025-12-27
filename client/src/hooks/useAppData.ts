/**
 * 🎯 useAppData - Single Source of Truth per tutti i dati dell'app
 * 
 * Hook centralizzato che:
 * - Gestisce Redux state + auto-refresh
 * - Fornisce API unificata a tutti i componenti
 * - Sostituisce localStorage reads sparsi
 */

import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/redux/store/store';
import { fetchTeamMatches } from '@/redux/slices/matchSlice';
import { fetchTeamUsers } from '@/redux/slices/usersSlice';
import { fetchTeamPlayerCards } from '@/redux/slices/playerCardsSlice';
import { fetchUserVotingSessions } from '@/redux/slices/votingSlice';


interface UseAppDataReturn {
    // 📊 Dati
    matches: any[];
    users: any[];
    playerCards: any[];
    sessions: any[];

    // 🔄 Stati granulari (ENTERPRISE APPROACH)
    isLoading: {
        matches: boolean;
        users: boolean;
        playerCards: boolean;
        sessions: boolean;
        any: boolean;        // true se qualcuno sta caricando
        all: boolean;        // true se tutti stanno caricando
    };

    error: {
        matches: string | null;
        users: string | null;
        playerCards: string | null;
        sessions: string | null;
        any: boolean;        // true se c'è qualche errore
    };

    // 🛠️ Actions
    refreshData: () => void;
}

export const useAppData = (): UseAppDataReturn => {
    const dispatch = useDispatch<AppDispatch>();
    const { user } = useSelector((state: RootState) => state.auth);

    // 📊 Selettori Redux granulari (ENTERPRISE)
    const { matches, isLoading: matchesLoading, error: matchesError } = useSelector((state: RootState) => state.matches);
    const { users, isLoading: usersLoading, error: usersError } = useSelector((state: RootState) => state.users);
    const { playerCards, isLoading: cardsLoading, error: cardsError } = useSelector((state: RootState) => state.playerCards);
    const { sessions, isLoading: sessionsLoading, error: sessionsError } = useSelector((state: RootState) => state.voting);

    // 🔄 Loading states granulari
    const isLoading = {
        matches: matchesLoading,
        users: usersLoading,
        playerCards: cardsLoading,
        sessions: sessionsLoading,
        any: matchesLoading || usersLoading || cardsLoading || sessionsLoading,
        all: matchesLoading && usersLoading && cardsLoading && sessionsLoading
    };

    // ❌ Error states granulari  
    const error = {
        matches: matchesError,
        users: usersError,
        playerCards: cardsError,
        sessions: sessionsError,
        any: !!(matchesError || usersError || cardsError || sessionsError)
    };

    // 🔄 Auto-fetch iniziale
    useEffect(() => {
        if (!user || !user.teams?.length) {
            return;
        }

        const teamId = user.teams[0].id;
        dispatch(fetchTeamMatches(teamId));
        dispatch(fetchTeamUsers(teamId));
        dispatch(fetchTeamPlayerCards(teamId));
        dispatch(fetchUserVotingSessions({ page: 1, limit: 50 }));
    }, [user, dispatch]);

    // 🔄 Auto-refresh su visibility change (per tutte le pagine)
    useEffect(() => {
        if (!user || !user.teams?.length) {
            return;
        }

        const teamId = user.teams[0].id;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                dispatch(fetchTeamMatches(teamId));
                dispatch(fetchTeamUsers(teamId));        // ✅ RIATTIVATO dopo fix cache backend
                dispatch(fetchTeamPlayerCards(teamId));  // ✅ RIATTIVATO dopo fix cache backend
                dispatch(fetchUserVotingSessions({ page: 1, limit: 50 }));

            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [user, dispatch]);

    // 🛠️ Refresh manuale
    const refreshData = () => {
        if (!user || !user.teams?.length) return;

        const teamId = user.teams[0].id;
        // 🔄 Refresh manuale di tutti i dati
        dispatch(fetchTeamMatches(teamId));
        dispatch(fetchTeamUsers(teamId));
        dispatch(fetchTeamPlayerCards(teamId));
        dispatch(fetchUserVotingSessions({ page: 1, limit: 50 }));
    };

    return {
        // 📊 Dati (tutti da Redux ora!)
        matches: matches || [],
        users: users || [],
        playerCards: playerCards || [],
        sessions: sessions || [],

        // 🔄 Stati
        isLoading,
        error,

        // 🛠️ Actions
        refreshData
    };
};

export default useAppData;