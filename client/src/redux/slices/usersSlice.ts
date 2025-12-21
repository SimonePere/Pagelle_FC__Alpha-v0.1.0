/**
 * Users Slice - Gestisce utenti/teammates con cache busting
 */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "../../lib/api";
import { User } from "../../types/api";

// Stato degli utenti
interface UsersState {
    users: User[];
    teammates: User[];
    isLoading: boolean;
    error: string | null;
}

// 🔥 QUESTO È IL TRUCCO: Random parameter per cache busting
export const fetchTeamUsers = createAsyncThunk(
    'users/fetchTeamUsers',
    async (teamId: string, { rejectWithValue }) => {
        try {
            // 🎯 CACHE BUSTING: stesso trick di matchSlice
            const randomParam = Math.random().toString(36).substring(7);
            const response = await api.get(`/users/team/${teamId}?force=${randomParam}`);

            return response.users || [];
        } catch (error: any) {
            // 🔄 FALLBACK: se API non esiste, usa localStorage
            console.log('📦 Using localStorage fallback for users');
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            return users.filter((u: any) => u.teamId === teamId);
        }
    }
);

// Stato iniziale
const initialState: UsersState = {
    users: [],
    teammates: [],
    isLoading: false,
    error: null
};

// Slice con reducers
const usersSlice = createSlice({
    name: 'users',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchTeamUsers.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchTeamUsers.fulfilled, (state, action) => {
                state.users = action.payload;
                state.teammates = action.payload;
                state.isLoading = false;
            })
            .addCase(fetchTeamUsers.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    }
});

export const { clearError } = usersSlice.actions;
export default usersSlice.reducer;
export type { UsersState };