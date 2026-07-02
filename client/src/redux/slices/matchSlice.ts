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
  lastCreatedGuestPlayers: Array<{ name: string; inviteToken: string; inviteUrl: string }> | null;
  rosterEditable: { editable: boolean; reason: string | null } | null;
  isRosterMutating: boolean;
  filter: {
    status: Match['status'] | 'all';
  };
}

// Async thunks
export const fetchTeamMatches = createAsyncThunk(
  'matches/fetchTeamMatches',
  async (teamId: string, { rejectWithValue }) => {
    try {
      // Legge la stagione selezionata dal localStorage (impostata da SeasonSelector).
      // Se assente, il backend usa la stagione corrente come default.
      const season = localStorage.getItem('season_selected') || 'current';
      const randomParam = Math.random().toString(36).substring(7);
      const response = await api.get(`/matches/team/${teamId}?season=${season}&force=${randomParam}`);

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

/**
 * 🔇 Refresh silenzioso del currentMatch: stessa fetch di fetchMatchById ma
 *    NON tocca `isLoading` → evita lo spinner full-page nelle pagine che
 *    mostrano un loader globale (es. MatchDetails).
 *    Usato dopo mutazioni "in-place" del roster.
 */
export const refreshCurrentMatchSilent = createAsyncThunk(
  'matches/refreshSilent',
  async (matchId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/matches/${matchId}`);
      const match = {
        ...response.match,
        teamMembers: response.match.teamMemberIds,
        teamMemberIds: response.match.teamMemberIds?.map((member: any) => member._id || member.id) || []
      };
      return match;
    } catch (error: any) {
      console.error('❌ Errore refreshCurrentMatchSilent:', error);
      return rejectWithValue(error.message || 'Errore refresh match');
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

      return {
        match: response.match,
        guestPlayers: (response.guestPlayers || []) as Array<{ name: string; inviteToken: string; inviteUrl: string }>,
      };
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

// === GESTIONE ROSTER POST-CREAZIONE (add/remove player + guest) ===

export const fetchRosterEditable = createAsyncThunk(
  'matches/fetchRosterEditable',
  async (matchId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/matches/${matchId}/roster-editable`);
      return { editable: !!response.editable, reason: response.reason ?? null };
    } catch (error: any) {
      console.error('❌ Errore fetchRosterEditable:', error);
      return rejectWithValue(error.message || 'Errore verifica stato roster');
    }
  }
);

export const addRegisteredPlayerToMatch = createAsyncThunk(
  'matches/addRegisteredPlayer',
  async (
    {
      matchId,
      userId,
      // 🎯 userObj opzionale: se passato, lo usiamo per l'update ottimistico
      //    così l'UI riflette subito l'aggiunta senza aspettare il refresh.
      userObj
    }: { matchId: string; userId: string; userObj?: any },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const response = await api.post(`/matches/${matchId}/players`, { userId });
      // Refetch SILENZIOSO: aggiorna currentMatch senza toggle isLoading
      // (altrimenti la pagina mostra spinner full-page = sembra un reload).
      await dispatch(refreshCurrentMatchSilent(matchId));
      return response.match;
    } catch (error: any) {
      console.error('❌ Errore addRegisteredPlayerToMatch:', error);
      return rejectWithValue(error.message || 'Errore aggiunta giocatore');
    }
  }
);

export const addGuestPlayerToMatch = createAsyncThunk(
  'matches/addGuestPlayer',
  async (
    { matchId, name, position }: { matchId: string; name: string; position?: string },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const response = await api.post(`/matches/${matchId}/guest-players`, { name, position });
      await dispatch(refreshCurrentMatchSilent(matchId));
      return { match: response.match, guest: response.guest };
    } catch (error: any) {
      console.error('❌ Errore addGuestPlayerToMatch:', error);
      return rejectWithValue(error.message || 'Errore aggiunta guest');
    }
  }
);

export const removePlayerFromMatch = createAsyncThunk(
  'matches/removePlayer',
  async (
    { matchId, playerId }: { matchId: string; playerId: string },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const response = await api.delete(`/matches/${matchId}/players/${playerId}`);
      await dispatch(refreshCurrentMatchSilent(matchId));
      return response.match;
    } catch (error: any) {
      console.error('❌ Errore removePlayerFromMatch:', error);
      return rejectWithValue(error.message || 'Errore rimozione giocatore');
    }
  }
);


const initialState: MatchState = {
  matches: [],
  currentMatch: null,
  isLoading: false,
  isSubmittingRatings: false,
  error: null,
  lastCreatedGuestPlayers: null,
  rosterEditable: null,
  isRosterMutating: false,
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
      // Refresh silenzioso: aggiorna currentMatch senza toccare isLoading
      .addCase(refreshCurrentMatchSilent.fulfilled, (state, action) => {
        state.currentMatch = action.payload;
        const idx = state.matches.findIndex(m => (m as any).id === (action.payload as any).id);
        if (idx !== -1) state.matches[idx] = action.payload;
      })

    // Create match
    builder
      .addCase(createMatch.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createMatch.fulfilled, (state, action) => {
        state.matches.unshift(action.payload.match);
        state.currentMatch = action.payload.match;
        state.lastCreatedGuestPlayers = action.payload.guestPlayers.length > 0 ? action.payload.guestPlayers : null;
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

    // Roster editable status
    builder
      .addCase(fetchRosterEditable.fulfilled, (state, action) => {
        state.rosterEditable = action.payload;
      })
      .addCase(fetchRosterEditable.rejected, (state) => {
        state.rosterEditable = null;
      });

    // Roster mutations (add/remove player + guest) — refetch match dentro al thunk
    // 🚀 UPDATE OTTIMISTICO: aggiorniamo subito currentMatch nel `.pending`
    //    per dare risposta istantanea in UI. In caso di errore, il
    //    `refreshCurrentMatchSilent` (in fulfilled) o un nuovo refresh (in rejected)
    //    riallinea allo stato reale del backend.
    const optimisticUpdateMatch = (state: any, matchId: string, mutator: (m: any) => void) => {
      if (state.currentMatch?.id === matchId) mutator(state.currentMatch);
      const idx = state.matches.findIndex((m: any) => m.id === matchId);
      if (idx !== -1) mutator(state.matches[idx]);
    };

    builder
      .addCase(addRegisteredPlayerToMatch.pending, (state, action) => {
        state.isRosterMutating = true;
        state.error = null;
        const { matchId, userId, userObj } = action.meta.arg;
        // 🛡️ Clone difensivo: evita reference condivisa con altri slice
        const safeUserObj = userObj
          ? JSON.parse(JSON.stringify(userObj))
          : { id: userId, _id: userId, name: 'Caricamento…' };
        optimisticUpdateMatch(state, matchId, (m) => {
          m.teamMemberIds = m.teamMemberIds || [];
          m.teamMembers = m.teamMembers || [];
          if (!m.teamMemberIds.includes(userId)) m.teamMemberIds.push(userId);
          const already = m.teamMembers.some((tm: any) => (tm._id || tm.id) === userId);
          if (!already) m.teamMembers.push(safeUserObj);
        });
      })
      .addCase(addRegisteredPlayerToMatch.fulfilled, (state) => {
        state.isRosterMutating = false;
      })
      .addCase(addRegisteredPlayerToMatch.rejected, (state, action) => {
        state.isRosterMutating = false;
        state.error = action.payload as string;
        // rollback: ricarica stato vero
        // (dispatch fuori dal reducer non è possibile; il modal può dispatchare refresh in catch)
      })
      .addCase(addGuestPlayerToMatch.pending, (state) => {
        state.isRosterMutating = true;
        state.error = null;
      })
      .addCase(addGuestPlayerToMatch.fulfilled, (state, action) => {
        state.isRosterMutating = false;
        // Update ottimistico col guest appena creato
        const { matchId } = action.meta.arg;
        const guest = action.payload?.guest;
        if (guest?.userId) {
          optimisticUpdateMatch(state, matchId, (m) => {
            m.teamMemberIds = m.teamMemberIds || [];
            m.teamMembers = m.teamMembers || [];
            if (!m.teamMemberIds.includes(guest.userId)) m.teamMemberIds.push(guest.userId);
            const already = m.teamMembers.some((tm: any) => (tm._id || tm.id) === guest.userId);
            if (!already) {
              m.teamMembers.push({
                id: guest.userId,
                _id: guest.userId,
                name: guest.name,
                isGuest: true,
                inviteToken: guest.inviteToken,
                position: guest.position
              });
            }
          });
        }
      })
      .addCase(addGuestPlayerToMatch.rejected, (state, action) => {
        state.isRosterMutating = false;
        state.error = action.payload as string;
      })
      .addCase(removePlayerFromMatch.pending, (state, action) => {
        state.isRosterMutating = true;
        state.error = null;
        const { matchId, playerId } = action.meta.arg;
        optimisticUpdateMatch(state, matchId, (m) => {
          if (Array.isArray(m.teamMemberIds)) {
            m.teamMemberIds = m.teamMemberIds.filter((id: any) => String(id) !== String(playerId));
          }
          if (Array.isArray(m.teamMembers)) {
            m.teamMembers = m.teamMembers.filter(
              (tm: any) => String(tm._id || tm.id) !== String(playerId)
            );
          }
        });
      })
      .addCase(removePlayerFromMatch.fulfilled, (state) => {
        state.isRosterMutating = false;
      })
      .addCase(removePlayerFromMatch.rejected, (state, action) => {
        state.isRosterMutating = false;
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