/**
 * Awards Slice — gestisce lo stato delle card trofeo "Pagelle FC Awards".
 *
 * Struttura:
 *  - byTeam:           cache lista award per team (chiave = teamId)
 *  - pendingAwards:    award READY non ancora viste dall'utente (badge sidebar, toast login)
 *  - currentAward:     award correntemente aperto in modal/dettaglio
 *  - publicAward:      award caricato dalla pagina pubblica /c/:id (no auth)
 *
 * Pattern stile coerente con altri slice (newsSlice/votingSlice):
 *  - createAsyncThunk + .addCase su pending/fulfilled/rejected
 *  - rejectWithValue per messaggi d'errore puliti
 *
 * Endpoint backend usati (vedi routes/awards.js):
 *  GET  /awards/team/:teamId
 *  GET  /awards/pending
 *  GET  /awards/:awardId
 *  POST /awards/:awardId/viewed
 *  POST /awards/:awardId/share
 *  GET  /awards/public/:awardId  (no auth)
 */

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api, apiCall } from "../../lib/api";
import {
    Award,
    PublicAward,
    AwardsListFilters,
    AwardsListResponse,
    AwardsPendingResponse,
    ShareChannel,
} from "../../types/award";

// ─── State ────────────────────────────────────────────────────────────────────

interface AwardsState {
    /** Cache per team. Chiave = teamId. */
    byTeam: Record<string, Award[]>;
    /** Award caricate per il team attivo: copia "flat" comoda per la Bacheca. */
    teamAwards: Award[];
    /** Award READY non ancora viste dall'utente (tutti i team). */
    pendingAwards: Award[];
    /** Award correntemente aperta nel modal/dettaglio. */
    currentAward: Award | null;
    /** Award caricata dalla pagina pubblica /c/:id (no auth). */
    publicAward: PublicAward | null;

    isLoadingList: boolean;
    isLoadingPending: boolean;
    isLoadingDetail: boolean;
    isLoadingPublic: boolean;
    error: string | null;

    /** Ultimo teamId per cui abbiamo caricato la bacheca (cache hit detection). */
    lastTeamId: string | null;
}

const initialState: AwardsState = {
    byTeam: {},
    teamAwards: [],
    pendingAwards: [],
    currentAward: null,
    publicAward: null,
    isLoadingList: false,
    isLoadingPending: false,
    isLoadingDetail: false,
    isLoadingPublic: false,
    error: null,
    lastTeamId: null,
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchTeamAwards = createAsyncThunk(
    'awards/fetchTeamAwards',
    async ({ teamId, filters }: { teamId: string; filters?: AwardsListFilters }, { rejectWithValue }) => {
        try {
            const params = new URLSearchParams();
            if (filters?.type) params.set('type', filters.type);
            if (filters?.status) params.set('status', filters.status);
            if (filters?.limit !== undefined) params.set('limit', String(filters.limit));
            if (filters?.skip !== undefined) params.set('skip', String(filters.skip));
            const qs = params.toString();
            const url = `/awards/team/${teamId}${qs ? `?${qs}` : ''}`;
            const response: AwardsListResponse = await api.get(url);
            return { teamId, response };
        } catch (error: any) {
            console.error('❌ fetchTeamAwards:', error);
            return rejectWithValue(error.message || 'Errore caricamento award team');
        }
    }
);

export const fetchPendingAwards = createAsyncThunk(
    'awards/fetchPending',
    async (_: void, { rejectWithValue }) => {
        try {
            const response: AwardsPendingResponse = await api.get('/awards/pending');
            return response;
        } catch (error: any) {
            console.error('❌ fetchPendingAwards:', error);
            return rejectWithValue(error.message || 'Errore caricamento award pendenti');
        }
    }
);

export const fetchAward = createAsyncThunk(
    'awards/fetchOne',
    async (awardId: string, { rejectWithValue }) => {
        try {
            const response: { award: Award } = await api.get(`/awards/${awardId}`);
            return response.award;
        } catch (error: any) {
            console.error('❌ fetchAward:', error);
            return rejectWithValue(error.message || 'Errore caricamento award');
        }
    }
);

/**
 * Pagina pubblica /c/:id — NON usa il token JWT.
 * Usiamo `apiCall` direttamente per coerenza con il base URL configurato.
 */
export const fetchPublicAward = createAsyncThunk(
    'awards/fetchPublic',
    async (awardId: string, { rejectWithValue }) => {
        try {
            const response: { award: PublicAward } = await apiCall(`/awards/public/${awardId}`);
            return response.award;
        } catch (error: any) {
            console.error('❌ fetchPublicAward:', error);
            return rejectWithValue(error.message || 'Award non trovata');
        }
    }
);

export const markAwardViewed = createAsyncThunk(
    'awards/markViewed',
    async (awardId: string, { rejectWithValue }) => {
        try {
            await api.post(`/awards/${awardId}/viewed`);
            return awardId;
        } catch (error: any) {
            console.error('❌ markAwardViewed:', error);
            return rejectWithValue(error.message || 'Errore marcatura vista');
        }
    }
);

export const trackAwardShare = createAsyncThunk(
    'awards/trackShare',
    async ({ awardId, channel }: { awardId: string; channel: ShareChannel }, { rejectWithValue }) => {
        try {
            await api.post(`/awards/${awardId}/share`, { channel });
            return { awardId, channel };
        } catch (error: any) {
            console.error('❌ trackAwardShare:', error);
            return rejectWithValue(error.message || 'Errore tracking share');
        }
    }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const awardsSlice = createSlice({
    name: 'awards',
    initialState,
    reducers: {
        clearAwardsError(state) {
            state.error = null;
        },
        clearCurrentAward(state) {
            state.currentAward = null;
        },
        clearPublicAward(state) {
            state.publicAward = null;
        },
        /** Rimuove un award dalla lista pendenti (locale, dopo che è stato visto). */
        removePending(state, action: PayloadAction<string>) {
            state.pendingAwards = state.pendingAwards.filter(a => a.id !== action.payload);
        },
    },
    extraReducers: (builder) => {
        // fetchTeamAwards
        builder
            .addCase(fetchTeamAwards.pending, (state) => {
                state.isLoadingList = true;
                state.error = null;
            })
            .addCase(fetchTeamAwards.fulfilled, (state, action) => {
                state.isLoadingList = false;
                const { teamId, response } = action.payload;
                state.byTeam[teamId] = response.awards;
                state.teamAwards = response.awards;
                state.lastTeamId = teamId;
            })
            .addCase(fetchTeamAwards.rejected, (state, action) => {
                state.isLoadingList = false;
                state.error = (action.payload as string) || 'Errore caricamento award';
            });

        // fetchPendingAwards
        builder
            .addCase(fetchPendingAwards.pending, (state) => {
                state.isLoadingPending = true;
            })
            .addCase(fetchPendingAwards.fulfilled, (state, action) => {
                state.isLoadingPending = false;
                state.pendingAwards = action.payload.awards;
            })
            .addCase(fetchPendingAwards.rejected, (state, action) => {
                state.isLoadingPending = false;
                state.error = (action.payload as string) || 'Errore caricamento pendenti';
            });

        // fetchAward
        builder
            .addCase(fetchAward.pending, (state) => {
                state.isLoadingDetail = true;
                state.error = null;
            })
            .addCase(fetchAward.fulfilled, (state, action) => {
                state.isLoadingDetail = false;
                state.currentAward = action.payload;
            })
            .addCase(fetchAward.rejected, (state, action) => {
                state.isLoadingDetail = false;
                state.error = (action.payload as string) || 'Errore caricamento award';
            });

        // fetchPublicAward
        builder
            .addCase(fetchPublicAward.pending, (state) => {
                state.isLoadingPublic = true;
                state.error = null;
                state.publicAward = null;
            })
            .addCase(fetchPublicAward.fulfilled, (state, action) => {
                state.isLoadingPublic = false;
                state.publicAward = action.payload;
            })
            .addCase(fetchPublicAward.rejected, (state, action) => {
                state.isLoadingPublic = false;
                state.error = (action.payload as string) || 'Award non disponibile';
            });

        // markAwardViewed → rimuovi da pending
        builder.addCase(markAwardViewed.fulfilled, (state, action) => {
            const awardId = action.payload;
            state.pendingAwards = state.pendingAwards.filter(a => a.id !== awardId);
        });
    },
});

export const { clearAwardsError, clearCurrentAward, clearPublicAward, removePending } = awardsSlice.actions;
export default awardsSlice.reducer;
