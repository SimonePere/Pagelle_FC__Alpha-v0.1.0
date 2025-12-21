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


interface UseAppDataReturn {
    // 📊 Dati
    matches: any[];
    users: any[];
    playerCards: any[];

    // 🔄 Stati granulari (ENTERPRISE APPROACH)
    isLoading: {
        matches: boolean;
        users: boolean;
        playerCards: boolean;
        any: boolean;        // true se qualcuno sta caricando
        all: boolean;        // true se tutti stanno caricando
    };

    error: {
        matches: string | null;
        users: string | null;
        playerCards: string | null;
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

    // 🔄 Loading states granulari
    const isLoading = {
        matches: matchesLoading,
        users: usersLoading,
        playerCards: cardsLoading,
        any: matchesLoading || usersLoading || cardsLoading,
        all: matchesLoading && usersLoading && cardsLoading
    };

    // ❌ Error states granulari  
    const error = {
        matches: matchesError,
        users: usersError,
        playerCards: cardsError,
        any: !!(matchesError || usersError || cardsError)
    };

    // 🔄 Auto-fetch iniziale
    useEffect(() => {
        if (!user || !user.teams?.length) {
            return;
        }

        const teamId = user.teams[0].id;
        dispatch(fetchTeamMatches(teamId));
        dispatch(fetchTeamUsers(teamId));        // ✅ RIATTIVATO dopo fix cache backend
        dispatch(fetchTeamPlayerCards(teamId));  // ✅ RIATTIVATO dopo fix cache backend
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
        dispatch(fetchTeamUsers(teamId));        // ✅ RIATTIVATO dopo fix cache backend
        dispatch(fetchTeamPlayerCards(teamId));  // ✅ RIATTIVATO dopo fix cache backend
    };

    return {
        // 📊 Dati (tutti da Redux ora!)
        matches: matches || [],
        users: users || [],            // ✅ Da Redux users slice
        playerCards: playerCards || [], // ✅ Da Redux playerCards slice

        // 🔄 Stati
        isLoading,
        error,

        // 🛠️ Actions
        refreshData
    };
};

export default useAppData;