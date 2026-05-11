/**
 * 🏠 useHomeDashboard - Hook specializzato per la Home Dashboard
 * 
 * Hook che combina useAppData con logica specifica per Home:
 * - Leaderboard calculations e API calls
 * - Pending matches filtering
 * - Onboarding state management
 * - Home-specific data transformations
 * 
 * Fornisce un'API unificata per la Home senza duplicare la logica base
 */

import { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/redux/store/store';
import { loadEnrichedUserData } from '@/redux/slices/authSlice';
import { Match } from '@/types/match';
import { User } from '@/types/api';
import { PlayerCard } from '@/types/playerCard';
import { api } from '@/lib/api';
import useAppData from './useAppData';
import { useActiveTeamId } from './useActiveTeamId';

// Types per Home Dashboard
interface PlayerStats {
    playerId: string;
    playerName: string;
    averageRating?: number;
    totalGoals?: number;
    totalAssists?: number;
    totalMatches?: number;
    playerCardAverage?: number;
    playerCardTOT?: number;
    formRating?: number;
    goalPerMatch?: number;        // 🆕 Media gol per partita
    assistPerMatch?: number;      // 🆕 Media assist per partita
}

type LeaderboardType = 'rating' | 'goals' | 'assists' | 'playercard' | 'stats-per-match';

interface UseHomeDashboardReturn {
    // 📊 Dati base da useAppData
    matches: any[];
    users: any[];
    playerCards: any[];
    sessions: any[];
    news: any[]; // 🎯 News per FakeNews component!

    // 🔄 Loading/Error states base
    isLoading: {
        matches: boolean;
        users: boolean;
        playerCards: boolean;
        sessions: boolean;
        news: boolean;
        any: boolean;
        all: boolean;
        leaderboard: boolean; // 🆕 Home-specific loading
    };

    error: {
        matches: string | null;
        users: string | null;
        playerCards: string | null;
        sessions: string | null;
        news: string | null;
        any: boolean;
        leaderboard: string | null; // 🆕 Home-specific error
    };

    // 🏠 Home-specific data
    leaderboard: PlayerStats[];
    pendingMatches: Match[];
    allUsers: User[];
    playerCardsFiltered: PlayerCard[];
    showOnboarding: boolean;
    activeLeaderboard: LeaderboardType;

    // 🛠️ Actions base da useAppData
    refreshData: () => void;
    loadNewsByCategory: (category: string) => void;
    loadNewsById: (newsId: string) => void;
    loadNewsByPriority: (priority: string) => void;
    loadUrgentNews: () => void;

    // 🏠 Home-specific actions
    setActiveLeaderboard: (type: LeaderboardType) => void;
    handleOnboardingComplete: () => void;
    loadLeaderboard: (type: LeaderboardType, teamId: string) => void;
}

export const useHomeDashboard = (): UseHomeDashboardReturn => {
    const { user } = useSelector((state: RootState) => state.auth);
    const dispatch = useDispatch<AppDispatch>();
    const { activeTeamId } = useActiveTeamId();

    // 🎯 Base data da useAppData - include NEWS!
    const {
        matches,
        users,
        playerCards,
        sessions,
        news, // 🎯 Per FakeNews!
        isLoading: baseLoading,
        error: baseError,
        refreshData,
        loadNewsByCategory,
        loadNewsById,
        loadNewsByPriority,
        loadUrgentNews
    } = useAppData();

    // 🏠 Home-specific states
    const [leaderboard, setLeaderboard] = useState<PlayerStats[]>([]);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [activeLeaderboard, setActiveLeaderboard] = useState<LeaderboardType>('rating');
    const [leaderboardLoading, setLeaderboardLoading] = useState(false);
    const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

    // 🎯 Leaderboard API call logic (estratta da Home.tsx)
    const loadLeaderboard = async (type: LeaderboardType, teamId: string) => {
        if (!teamId) return;

        setLeaderboardLoading(true);
        setLeaderboardError(null);

        try {
            // 🆕 Se richiedi stats-per-match, includi il query param ?stat=both
            let url = `/leaderboards/${teamId}/${type}`;
            if (type === 'stats-per-match') {
                url = `${url}?stat=both`;
            }

            const response = await api.get(url);

            if (response.success) {
                setLeaderboard(response.data || []);
            } else {
                setLeaderboardError('Errore nel caricamento della classifica');
            }
        } catch (err) {
            console.error(`❌ Error loading ${type} leaderboard:`, err);
            setLeaderboardError('Errore di connessione');
            setLeaderboard([]);
        } finally {
            setLeaderboardLoading(false);
        }
    };

    // 🎯 Onboarding complete handler
    const handleOnboardingComplete = () => {
        if (user) {
            localStorage.setItem(`onboarding_${user._id}`, 'true');
        }
        setShowOnboarding(false);
    };

    // 🧮 Computed: Pending matches from matches data
    const pendingMatches = useMemo(() => {
        if (!matches?.length || !activeTeamId) return [];

        return matches
            .filter(m => m.teamId === activeTeamId)
            .filter(m => m.status === 'active');
    }, [matches, activeTeamId]);

    // 🧮 Computed: All users filtered by team
    const allUsers = useMemo(() => {
        if (!activeTeamId) return [];

        // Preferisci users da Redux se disponibili, altrimenti fallback localStorage
        if (users?.length) {
            return users.filter((u: any) => u.teamId === activeTeamId);
        }

        // Fallback localStorage (compatibilità)
        const storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
        return storedUsers.filter((u: any) => u.teamId === activeTeamId);
    }, [users, activeTeamId]);

    // 🧮 Computed: Player cards filtered by team
    const playerCardsFiltered = useMemo(() => {
        if (!activeTeamId) return [];

        // Preferisci playerCards da Redux se disponibili, altrimenti fallback localStorage
        if (playerCards?.length) {
            return playerCards.filter((c: any) => c.teamId === activeTeamId);
        }

        // Fallback localStorage (compatibilità)
        const storedCards = JSON.parse(localStorage.getItem('playerCards') || '[]') as PlayerCard[];
        return storedCards.filter(c => c.teamId === activeTeamId);
    }, [playerCards, activeTeamId]);

    // 🎯 Load enriched user data effect
    useEffect(() => {
        if (user && (!user.teams || !user.personalStats)) {
            dispatch(loadEnrichedUserData());
        }
    }, [user?.id, dispatch]);

    // 🎯 Onboarding check effect
    useEffect(() => {
        if (user) {
            const hasSeenOnboarding = localStorage.getItem(`onboarding_${user._id}`);
            if (!hasSeenOnboarding) {
                setShowOnboarding(true);
            }
        }
    }, [user?.id]);

    //  Auto-load leaderboard when activeLeaderboard or team changes
    useEffect(() => {
        if (activeTeamId) {
            loadLeaderboard(activeLeaderboard, activeTeamId);
        }
    }, [activeLeaderboard, activeTeamId]);

    // 🔗 Combined loading states
    const combinedLoading = {
        ...baseLoading,
        leaderboard: leaderboardLoading,
        any: baseLoading.any || leaderboardLoading,
        all: baseLoading.all && leaderboardLoading
    };

    // 🔗 Combined error states
    const combinedError = {
        ...baseError,
        leaderboard: leaderboardError,
        any: baseError.any || !!leaderboardError
    };

    return {
        // 📊 Base data (include NEWS!)
        matches: matches || [],
        users: users || [],
        playerCards: playerCards || [],
        sessions: sessions || [],
        news: news || [], // 🎯 Per FakeNews component!

        // 🔄 Combined loading/error states
        isLoading: combinedLoading,
        error: combinedError,

        // 🏠 Home-specific computed data
        leaderboard,
        pendingMatches,
        allUsers,
        playerCardsFiltered,
        showOnboarding,
        activeLeaderboard,

        // 🛠️ Base actions
        refreshData,
        loadNewsByCategory,
        loadNewsById,
        loadNewsByPriority,
        loadUrgentNews,

        // 🏠 Home-specific actions
        setActiveLeaderboard,
        handleOnboardingComplete,
        loadLeaderboard
    };
};

export default useHomeDashboard;