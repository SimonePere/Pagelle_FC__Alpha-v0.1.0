/**
 * PlayerCards Slice - Gestisce player cards con cache busting
 */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "../../lib/api";
import { PlayerCard } from "../../types/playerCard";

// Stato delle player cards
interface PlayerCardsState {
    playerCards: PlayerCard[];
    isLoading: boolean;
    error: string | null;
}

// 🔥 CACHE BUSTING: stesso trucco degli altri slice
export const fetchTeamPlayerCards = createAsyncThunk(
    'playerCards/fetchTeamPlayerCards',
    async (teamId: string, { rejectWithValue }) => {
        try {
            // 🎯 Random parameter per invalidare cache
            const randomParam = Math.random().toString(36).substring(7);
            const response = await api.get(`/player-cards/team/${teamId}?force=${randomParam}`);

            return response.playerCards || [];
        } catch (error: any) {
            // 🔄 FALLBACK: se API non esiste, usa localStorage (404 atteso)
            console.log('📦 Using localStorage fallback for playerCards');
            const cards = JSON.parse(localStorage.getItem('playerCards') || '[]') as PlayerCard[];
            return cards.filter(c => c.teamId === teamId);
        }
    }
);

// Stato iniziale
const initialState: PlayerCardsState = {
    playerCards: [],
    isLoading: false,
    error: null
};

// Slice con reducers
const playerCardsSlice = createSlice({
    name: 'playerCards',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchTeamPlayerCards.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchTeamPlayerCards.fulfilled, (state, action) => {
                state.playerCards = action.payload;
                state.isLoading = false;
            })
            .addCase(fetchTeamPlayerCards.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    }
});

export const { clearError } = playerCardsSlice.actions;
export default playerCardsSlice.reducer;
export type { PlayerCardsState };