/**
 * Match Slice
 * Gestisce lo stato delle partite nell'app
 */

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../lib/api";
import { Match } from "../../types/match";
import { CreateMatchRequest, SubmitRatingsRequest } from "../../types/api";

interface MatchState {
  matches: Match[];
  currentMatch: Match | null;
  isLoading: boolean;
  isSubmittingRatings: boolean;
  error: string | null;
  filter: {
    status: Match['status'] | 'all';
  };
}

// Async thunks
export const fetchTeamMatches = createAsyncThunk(
  'matches/fetchTeamMatches',
  async (teamId: string, { rejectWithValue }) => {
    try {
      // 🔧 SOLUZIONE SEMPLICE: Random parameter per invalidare cache
      const randomParam = Math.random().toString(36).substring(7);
      const response = await api.get(`/matches/team/${teamId}?force=${randomParam}`);

      // Mappiamo ogni match per adattarlo al formato frontend
      const matches = (response.matches || []).map((match: any) => ({
        ...match,
        teamMemberIds: match.teamMemberIds?.map((member: any) => member._id || member.id) || [],
        teamMembers: match.teamMemberIds // Usa teamMemberIds popolati dal backend
      }));

      return matches;
    } catch (error: any) {
      console.error('❌ Errore API fetchTeamMatches:', error);
      return rejectWithValue(error.message || 'Errore nel recupero delle partite');
    }
  }
); export const fetchMatchById = createAsyncThunk(
  'matches/fetchById',
  async (matchId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/matches/${matchId}`);

      // Mappiamo la risposta del backend al formato del frontend
      const match = {
        ...response.match,
        teamMembers: response.match.teamMemberIds, // ← USA teamMemberIds popolati dal backend!
        teamMemberIds: response.match.teamMemberIds?.map((member: any) => member._id || member.id) || []
      };

      return match;
    } catch (error: any) {
      console.error('❌ Errore fetchMatchById:', error);
      return rejectWithValue(error.message || 'Errore nel recupero della partita');
    }
  }
);

export const createMatch = createAsyncThunk(
  'matches/create',
  async (matchData: CreateMatchRequest, { rejectWithValue, dispatch }) => {
    try {
      const response = await api.post('/matches', matchData);

      // Refresh dei match del team dopo creazione
      dispatch(fetchTeamMatches(matchData.teamId));

      // Restituiamo solo il match object dalla risposta
      return response.match;
    } catch (error: any) {
      console.error('❌ Errore creazione match:', error);
      return rejectWithValue(error.message || 'Errore nella creazione della partita');
    }
  }
);

export const updateMatch = createAsyncThunk(
  'matches/update',
  async ({ matchId, matchData }: { matchId: string; matchData: Partial<CreateMatchRequest> }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/matches/${matchId}`, matchData);
      return response.match;
    } catch (error: any) {
      console.error('❌ Errore aggiornamento match:', error);
      return rejectWithValue(error.message || 'Errore nell\'aggiornamento della partita');
    }
  }
);

export const deleteMatch = createAsyncThunk(
  'matches/delete',
  async (matchId: string, { rejectWithValue }) => {
    try {
      await api.delete(`/matches/${matchId}`);
      return matchId;
    } catch (error: any) {
      console.error('❌ Errore eliminazione match:', error);
      return rejectWithValue(error.message || 'Errore nell\'eliminazione della partita');
    }
  }
);

export const submitMatchRatings = createAsyncThunk(
  'matches/submitRatings',
  async ({ matchId, ratingsData }: { matchId: string; ratingsData: SubmitRatingsRequest }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/matches/${matchId}/ratings`, ratingsData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Errore nell\'invio delle valutazioni');
    }
  }
);

// 🆕 NUOVE AZIONI PER GESTIONE STATO MATCH (commentate per ora)
/* 
export const activateMatch = createAsyncThunk(
  'matches/activate',
  async (matchId: string, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/matches/${matchId}/activate`);
      return response.match;
    } catch (error: any) {
      console.error('❌ Errore attivazione match:', error);
      return rejectWithValue(error.message || 'Errore nell\'attivazione della partita');
    }
  }
);

export const completeMatch = createAsyncThunk(
  'matches/complete',
  async (matchId: string, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/matches/${matchId}/complete`);
      return response.match;
    } catch (error: any) {
      console.error('❌ Errore completamento match:', error);
      return rejectWithValue(error.message || 'Errore nel completamento della partita');
    }
  }
);
*/

const initialState: MatchState = {
  matches: [],
  currentMatch: null,
  isLoading: false,
  isSubmittingRatings: false,
  error: null,
  filter: {
    status: 'all'
  }
};

const matchSlice = createSlice({
  name: 'matches',
  initialState,
  reducers: {
    setCurrentMatch: (state, action: PayloadAction<Match | null>) => {
      state.currentMatch = action.payload;
    },

    setFilter: (state, action: PayloadAction<Partial<MatchState['filter']>>) => {
      state.filter = { ...state.filter, ...action.payload };
    },

    clearError: (state) => {
      state.error = null;
    },

    updateMatchInList: (state, action: PayloadAction<Match>) => {
      const updatedMatch = action.payload;
      const matchIndex = state.matches.findIndex(m => (m as any).id === updatedMatch.id);

      if (matchIndex !== -1) {
        state.matches[matchIndex] = updatedMatch;
      }

      // Aggiorna anche il match corrente se è quello modificato
      if ((state.currentMatch as any)?.id === updatedMatch.id) {
        state.currentMatch = updatedMatch;
      }
    },

    sortMatches: (state, action: PayloadAction<'date' | 'field' | 'status'>) => {
      const sortBy = action.payload;

      state.matches.sort((a, b) => {
        switch (sortBy) {
          case 'date':
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          case 'field':
            return a.field.localeCompare(b.field);
          case 'status':
            return a.status.localeCompare(b.status);
          default:
            return 0;
        }
      });
    },

    clearMatches: (state) => {
      state.matches = [];
      state.currentMatch = null;
    }
  },

  extraReducers: (builder) => {
    // Fetch team matches
    builder
      .addCase(fetchTeamMatches.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTeamMatches.fulfilled, (state, action) => {
        state.matches = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchTeamMatches.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

    // Fetch match by ID
    builder
      .addCase(fetchMatchById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMatchById.fulfilled, (state, action) => {
        state.currentMatch = action.payload;
        state.isLoading = false;
        // Aggiorna anche nella lista se presente
        const matchIndex = state.matches.findIndex(m => (m as any).id === (action.payload as any).id);
        if (matchIndex !== -1) {
          state.matches[matchIndex] = action.payload;
        }
      })
      .addCase(fetchMatchById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

    // Create match
    builder
      .addCase(createMatch.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createMatch.fulfilled, (state, action) => {
        state.matches.unshift(action.payload); // Aggiungi all'inizio della lista
        state.currentMatch = action.payload;
        state.isLoading = false;
      })
      .addCase(createMatch.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

    // Update match
    builder.addCase(updateMatch.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    })
      .addCase(updateMatch.fulfilled, (state, action) => {
        state.isLoading = false;
        // Aggiorna il match nella lista
        const index = state.matches.findIndex(m => m.id === action.payload.id);
        if (index !== -1) {
          state.matches[index] = action.payload;
        }
        // Aggiorna anche currentMatch se corrisponde
        if (state.currentMatch?.id === action.payload.id) {
          state.currentMatch = action.payload;
        }
      })
      .addCase(updateMatch.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteMatch.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteMatch.fulfilled, (state, action) => {
        state.isLoading = false;
        // Rimuovi dalla lista
        state.matches = state.matches.filter(m => m.id !== action.payload);
        // Reset currentMatch se era quello eliminato
        if (state.currentMatch?.id === action.payload) {
          state.currentMatch = null;
        }
      })
      .addCase(deleteMatch.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Submit ratings
    builder
      .addCase(submitMatchRatings.pending, (state) => {
        state.isSubmittingRatings = true;
        state.error = null;
      })
      .addCase(submitMatchRatings.fulfilled, (state, action) => {
        const updatedMatch = action.payload;

        // Aggiorna il match corrente
        state.currentMatch = updatedMatch;

        // Aggiorna nella lista
        const matchIndex = state.matches.findIndex(m => (m as any).id === (updatedMatch as any).id);
        if (matchIndex !== -1) {
          state.matches[matchIndex] = updatedMatch;
        }

        state.isSubmittingRatings = false;
      })
      .addCase(submitMatchRatings.rejected, (state, action) => {
        state.isSubmittingRatings = false;
        state.error = action.payload as string;
      });
  },
});

// Selettori derivati (computed)
export const selectFilteredMatches = (state: { matches: MatchState }) => {
  const { matches, filter } = state.matches;

  return matches.filter(match => {
    const statusMatch = filter.status === 'all' || match.status === filter.status;
    return statusMatch;
  });
};

export const selectUpcomingMatches = (state: { matches: MatchState }) => {
  const now = new Date();
  return state.matches.matches.filter(match => new Date(match.date) > now);
};

export const selectPastMatches = (state: { matches: MatchState }) => {
  const now = new Date();
  return state.matches.matches.filter(match => new Date(match.date) <= now);
};

export const selectRecentMatches = (state: { matches: MatchState }, limit: number = 5) => {
  const now = new Date();
  return state.matches.matches
    .filter(match => new Date(match.date) <= now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
};

export const {
  setCurrentMatch,
  setFilter,
  clearError,
  updateMatchInList,
  sortMatches,
  clearMatches
} = matchSlice.actions;

export default matchSlice.reducer;

export type { MatchState };