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

// Types per Home Dashboard
interface PlayerStats {
    playerId: string;
    playerName: string;
    averageRating: number;
    totalGoals: number;
    totalAssists: number;
    totalMatches: number;
    playerCardAverage?: number;
    formRating?: number;
}

type LeaderboardType = 'rating' | 'goals' | 'assists' | 'playercard' | 'form';

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
            const response = await api.get(`/leaderboards/${teamId}/${type}`);

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
        if (!matches?.length || !user?.teams?.[0]?.id) return [];

        const currentTeamId = user.teams[0].id;
        return matches
            .filter(m => m.teamId === currentTeamId)
            .filter(m => m.status === 'active');
    }, [matches, user?.teams]);

    // 🧮 Computed: All users filtered by team
    const allUsers = useMemo(() => {
        if (!user?.teams?.[0]?.id) return [];

        // Preferisci users da Redux se disponibili, altrimenti fallback localStorage
        if (users?.length) {
            const currentTeamId = user.teams[0].id;
            return users.filter((u: any) => u.teamId === currentTeamId);
        }

        // Fallback localStorage (compatibilità)
        const storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
        const currentTeamId = user.teams[0].id;
        return storedUsers.filter((u: any) => u.teamId === currentTeamId);
    }, [users, user?.teams]);

    // 🧮 Computed: Player cards filtered by team
    const playerCardsFiltered = useMemo(() => {
        if (!user?.teams?.[0]?.id) return [];

        // Preferisci playerCards da Redux se disponibili, altrimenti fallback localStorage
        if (playerCards?.length) {
            const currentTeamId = user.teams[0].id;
            return playerCards.filter((c: any) => c.teamId === currentTeamId);
        }

        // Fallback localStorage (compatibilità)
        const storedCards = JSON.parse(localStorage.getItem('playerCards') || '[]') as PlayerCard[];
        const currentTeamId = user.teams[0].id;
        return storedCards.filter(c => c.teamId === currentTeamId);
    }, [playerCards, user?.teams]);

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

    // 🎯 Auto-load leaderboard when activeLeaderboard or team changes
    useEffect(() => {
        const currentTeamId = user?.teams?.[0]?.id;
        if (currentTeamId) {
            loadLeaderboard(activeLeaderboard, currentTeamId);
        }
    }, [activeLeaderboard, user?.teams?.[0]?.id]);

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