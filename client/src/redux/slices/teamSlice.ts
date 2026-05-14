/**
 * Team Slice
 * Gestisce lo stato dei team nell'app
 */

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../lib/api";
import { Team, CreateTeamRequest, JoinTeamRequest, UpdateTeamRequest } from "../../types/api";

interface TeamState {
  teams: Team[];
  myTeams: Team[];
  currentTeam: Team | null;
  isLoading: boolean;
  error: string | null;
  searchResults: Team[];
  isSearching: boolean;
}

// Async thunks
export const fetchAllTeams = createAsyncThunk(
  'teams/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/teams');
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Errore nel recupero dei team');
    }
  }
);

export const fetchMyTeams = createAsyncThunk(
  'teams/fetchMy',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/teams/my-teams');
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Errore nel recupero dei miei team');
    }
  }
);

export const fetchTeamById = createAsyncThunk(
  'teams/fetchById',
  async (teamId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/teams/${teamId}`);
      // Restituiamo solo il campo 'team' dalla risposta
      return response.team;
    } catch (error: any) {
      console.error('❌ Errore caricamento team:', error);
      return rejectWithValue(error.message || 'Errore nel recupero del team');
    }
  }
);

export const createTeam = createAsyncThunk(
  'teams/create',
  async (teamData: CreateTeamRequest, { rejectWithValue, dispatch }) => {
    try {
      const response = await api.post('/teams', teamData);
      dispatch(fetchMyTeams());
      return response.team;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Errore nella creazione del team');
    }
  }
);

export const joinTeam = createAsyncThunk(
  'teams/join',
  async (joinData: JoinTeamRequest, { rejectWithValue, dispatch }) => {
    try {
      const response = await api.post('/teams/join', joinData);
      dispatch(fetchMyTeams());
      return response.team || response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Errore nell\'unirsi al team');
    }
  }
);

export const leaveTeam = createAsyncThunk(
  'teams/leave',
  async (teamId: string, { rejectWithValue, dispatch }) => {
    try {
      await api.delete(`/teams/${teamId}/leave`);
      dispatch(fetchMyTeams());
      return teamId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Errore nell\'uscire dal team');
    }
  }
);

export const searchTeams = createAsyncThunk(
  'teams/search',
  async (query: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/teams/search?q=${encodeURIComponent(query)}`);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Errore nella ricerca team');
    }
  }
);

export const updateTeam = createAsyncThunk(
  'teams/update',
  async ({ teamId, data }: { teamId: string; data: UpdateTeamRequest }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/teams/${teamId}`, data);
      return response.team;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Errore nell\'aggiornamento del team');
    }
  }
);

export const removeMember = createAsyncThunk(
  'teams/removeMember',
  async ({ teamId, userId }: { teamId: string; userId: string }, { rejectWithValue, dispatch }) => {
    try {
      const response = await api.delete(`/teams/${teamId}/members/${userId}`);
      // Ricarica i dettagli del team per avere i membri aggiornati
      dispatch(fetchTeamById(teamId));
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Errore nella rimozione del membro');
    }
  }
);

// 🔒 Lista dei guest del team (solo team-admin / global admin)
export interface TeamGuest {
  id: string;
  name: string;
  position: string | null;
  canPromoteToPlayer: boolean;
  canPromoteToPlayerSetAt: string | null;
  inviteTokenMatchId: string | null;
  guestCreatedBy: string | null;
  createdAt: string;
}

export const fetchTeamGuests = createAsyncThunk<TeamGuest[], string>(
  'teams/fetchGuests',
  async (teamId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/teams/${teamId}/guests`);
      return response.guests || [];
    } catch (error: any) {
      return rejectWithValue(error.message || 'Errore nel recupero dei guest del team');
    }
  }
);

// 🔒 Toggle del flag canPromoteToPlayer per un guest
export const setGuestPromotionAllowed = createAsyncThunk<
  { guestId: string; allowed: boolean },
  { teamId: string; guestId: string; allowed: boolean }
>(
  'teams/setGuestPromotionAllowed',
  async ({ teamId, guestId, allowed }, { rejectWithValue }) => {
    try {
      await api.patch(`/teams/${teamId}/guests/${guestId}/promotion`, { allowed });
      return { guestId, allowed };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Errore nel salvataggio del permesso');
    }
  }
);

const initialState: TeamState = {
  teams: [],
  myTeams: [],
  currentTeam: null,
  isLoading: false,
  error: null,
  searchResults: [],
  isSearching: false,
};

const teamSlice = createSlice({
  name: 'teams',
  initialState,
  reducers: {
    setCurrentTeam: (state, action: PayloadAction<Team | null>) => {
      state.currentTeam = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.isSearching = false;
    },
    updateTeamInLists: (state, action: PayloadAction<Team>) => {
      const updatedTeam = action.payload;

      // Aggiorna nei team pubblici
      const teamIndex = state.teams.findIndex(t => t._id === updatedTeam._id);
      if (teamIndex !== -1) {
        state.teams[teamIndex] = updatedTeam;
      }

      // Aggiorna nei miei team
      const myTeamIndex = state.myTeams.findIndex(t => t._id === updatedTeam._id);
      if (myTeamIndex !== -1) {
        state.myTeams[myTeamIndex] = updatedTeam;
      }

      // Aggiorna il team corrente se è quello modificato
      if (state.currentTeam?._id === updatedTeam._id) {
        state.currentTeam = updatedTeam;
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch all teams
    builder
      .addCase(fetchAllTeams.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllTeams.fulfilled, (state, action) => {
        state.teams = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchAllTeams.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

    // Fetch my teams
    builder
      .addCase(fetchMyTeams.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMyTeams.fulfilled, (state, action) => {
        state.myTeams = action.payload;
        state.isLoading = false;

        // Se non c'è un team corrente e abbiamo team, imposta il primo come corrente
        if (!state.currentTeam && action.payload.length > 0) {
          state.currentTeam = action.payload[0];
        }
      })
      .addCase(fetchMyTeams.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

    // Fetch team by ID
    builder
      .addCase(fetchTeamById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTeamById.fulfilled, (state, action) => {
        state.currentTeam = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchTeamById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

    // Create team
    builder
      .addCase(createTeam.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createTeam.fulfilled, (state, action) => {
        state.myTeams.push(action.payload);
        state.currentTeam = action.payload;
        state.isLoading = false;
      })
      .addCase(createTeam.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

    // Join team
    builder
      .addCase(joinTeam.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(joinTeam.fulfilled, (state, action) => {
        const joinedTeam = action.payload;
        // Aggiungi ai miei team se non è già presente
        const exists = state.myTeams.find(t => t._id === joinedTeam._id);
        if (!exists) {
          state.myTeams.push(joinedTeam);
        }
        state.currentTeam = joinedTeam;
        state.isLoading = false;
      })
      .addCase(joinTeam.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

    // Leave team
    builder
      .addCase(leaveTeam.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(leaveTeam.fulfilled, (state, action) => {
        const leftTeamId = action.payload;
        state.myTeams = state.myTeams.filter(t => t._id !== leftTeamId);

        // Se il team corrente è quello che abbiamo lasciato, cambialo
        if (state.currentTeam?._id === leftTeamId) {
          state.currentTeam = state.myTeams.length > 0 ? state.myTeams[0] : null;
        }

        state.isLoading = false;
      })
      .addCase(leaveTeam.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

    // Search teams
    builder
      .addCase(searchTeams.pending, (state) => {
        state.isSearching = true;
        state.error = null;
      })
      .addCase(searchTeams.fulfilled, (state, action) => {
        state.searchResults = action.payload;
        state.isSearching = false;
      })
      .addCase(searchTeams.rejected, (state, action) => {
        state.isSearching = false;
        state.error = action.payload as string;
      })

    // Update team
    builder
      .addCase(updateTeam.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateTeam.fulfilled, (state, action) => {
        state.currentTeam = action.payload;
        // Aggiorna anche nelle liste
        const idx = state.myTeams.findIndex(t => t._id === action.payload._id);
        if (idx !== -1) {
          state.myTeams[idx] = action.payload;
        }
        state.isLoading = false;
      })
      .addCase(updateTeam.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

    // Remove member
    builder
      .addCase(removeMember.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(removeMember.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(removeMember.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // 🔒 Aggiorna in-place il flag canPromoteToPlayer del guest dentro currentTeam.memberIds
      // così la card del membro mostra subito lo stato corretto al riapertura del modale.
      .addCase(setGuestPromotionAllowed.fulfilled, (state, action) => {
        const { guestId, allowed } = action.payload;
        const team: any = state.currentTeam;
        if (team && Array.isArray(team.memberIds)) {
          for (const m of team.memberIds) {
            const id = (m && (m.id || m._id))?.toString?.() || '';
            if (id === guestId) {
              m.canPromoteToPlayer = allowed;
              break;
            }
          }
        }
      });
  },
});

export const {
  setCurrentTeam,
  clearError,
  clearSearchResults,
  updateTeamInLists
} = teamSlice.actions;

export default teamSlice.reducer;

export type { TeamState };