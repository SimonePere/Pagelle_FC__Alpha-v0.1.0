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
import {
    fetchRecentNews,
    fetchNewsByCategory,
    fetchNewsById,
    fetchNewsByPriority,
    fetchUrgentNews
} from '@/redux/slices/newsSlice';
import { useActiveTeamId } from './useActiveTeamId';


interface UseAppDataReturn {
    // 📊 Dati
    matches: any[];
    users: any[];
    playerCards: any[];
    sessions: any[];
    news: any[];

    // 🔄 Stati granulari (ENTERPRISE APPROACH)
    isLoading: {
        matches: boolean;
        users: boolean;
        playerCards: boolean;
        sessions: boolean;
        news: boolean;
        any: boolean;        // true se qualcuno sta caricando
        all: boolean;        // true se tutti stanno caricando
    };

    error: {
        matches: string | null;
        users: string | null;
        playerCards: string | null;
        sessions: string | null;
        news: string | null;


        any: boolean;        // true se c'è qualche errore
    };

    // 🛠️ Actions
    refreshData: () => void;

    // 📰 News Actions (granulari per componenti specifici)
    loadNewsByCategory: (category: string) => void;
    loadNewsById: (newsId: string) => void;
    loadNewsByPriority: (priority: string) => void;
    loadUrgentNews: () => void;
}

export const useAppData = (): UseAppDataReturn => {
    const dispatch = useDispatch<AppDispatch>();
    const { user } = useSelector((state: RootState) => state.auth);
    const { activeTeamId } = useActiveTeamId();

    // 📊 Selettori Redux granulari (ENTERPRISE)
    const { matches, isLoading: matchesLoading, error: matchesError } = useSelector((state: RootState) => state.matches);

    const { users, isLoading: usersLoading, error: usersError } = useSelector((state: RootState) => state.users);

    const { playerCards, isLoading: cardsLoading, error: cardsError } = useSelector((state: RootState) => state.playerCards);

    const { sessions, isLoading: sessionsLoading, error: sessionsError } = useSelector((state: RootState) => state.voting);

    const { news, isLoading: newsLoading, error: newsError } = useSelector((state: RootState) => state.news);

    // 🔄 Loading states granulari
    const isLoading = {
        matches: matchesLoading,
        users: usersLoading,
        playerCards: cardsLoading,
        sessions: sessionsLoading,
        news: newsLoading,
        any: matchesLoading || usersLoading || cardsLoading || sessionsLoading || newsLoading,
        all: matchesLoading && usersLoading && cardsLoading && sessionsLoading && newsLoading
    };

    // ❌ Error states granulari  
    const error = {
        matches: matchesError,
        users: usersError,
        playerCards: cardsError,
        sessions: sessionsError,
        news: newsError,
        any: !!(matchesError || usersError || cardsError || sessionsError || newsError)
    };

    // 🔄 Auto-fetch iniziale
    useEffect(() => {
        if (!user || !activeTeamId) {
            return;
        }

        const teamId = activeTeamId;
        dispatch(fetchTeamMatches(teamId));
        dispatch(fetchTeamUsers(teamId));
        dispatch(fetchTeamPlayerCards(teamId));
        dispatch(fetchUserVotingSessions({ page: 1, limit: 50 }));
        dispatch(fetchRecentNews(teamId)); // 🎯 News recenti per dashboard
    }, [user, activeTeamId, dispatch]);

    // 🔄 Auto-refresh su visibility change (per tutte le pagine)
    useEffect(() => {
        if (!user || !activeTeamId) {
            return;
        }

        const teamId = activeTeamId;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                dispatch(fetchTeamMatches(teamId));
                dispatch(fetchTeamUsers(teamId));        // ✅ RIATTIVATO dopo fix cache backend
                dispatch(fetchTeamPlayerCards(teamId));  // ✅ RIATTIVATO dopo fix cache backend
                dispatch(fetchUserVotingSessions({ page: 1, limit: 50 }));
                dispatch(fetchRecentNews(teamId)); // 🎯 News recenti per dashboard


            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [user, dispatch]);

    // 🛠️ Refresh manuale
    const refreshData = () => {
        if (!user || !activeTeamId) return;

        const teamId = activeTeamId;
        // 🔄 Refresh manuale di tutti i dati
        dispatch(fetchTeamMatches(teamId));
        dispatch(fetchTeamUsers(teamId));
        dispatch(fetchTeamPlayerCards(teamId));
        dispatch(fetchUserVotingSessions({ page: 1, limit: 50 }));
        dispatch(fetchRecentNews(teamId)); // 🎯 News recenti per dashboard
    };

    // 📰 Metodi granulari per componenti specifici
    const loadNewsByCategory = (category: string) => {
        if (!user || !user.teams?.length) return;
        const teamId = activeTeamId;
        if (!teamId) return;
        dispatch(fetchNewsByCategory({ category, teamId }));
    };

    const loadNewsById = (newsId: string) => {
        dispatch(fetchNewsById(newsId));
    };

    const loadNewsByPriority = (priority: string) => {
        if (!user || !user.teams?.length) return;
        const teamId = user.teams[0].id;
        dispatch(fetchNewsByPriority({ priority, teamId }));
    };

    const loadUrgentNews = () => {
        if (!user || !user.teams?.length) return;
        const teamId = user.teams[0].id;
        dispatch(fetchUrgentNews(teamId));
    };

    return {
        // 📊 Dati (tutti da Redux ora!)
        matches: matches || [],
        users: users || [],
        playerCards: playerCards || [],
        sessions: sessions || [],
        news: news || [],

        // 🔄 Stati
        isLoading,
        error,

        // 🛠️ Actions
        refreshData,

        // 📰 News Actions (granulari)
        loadNewsByCategory,
        loadNewsById,
        loadNewsByPriority,
        loadUrgentNews
    };
};

export default useAppData;