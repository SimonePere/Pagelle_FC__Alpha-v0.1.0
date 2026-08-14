import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../lib/api";
import { User } from "../../types/api";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  guestMatchId: string | null;
  error: string | null;
}

// Auth helpers semplificati
const authHelpers = {
  saveAuth(user: User, token: string) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!(token && user);
  },

  isTokenExpired(): boolean {
    const token = localStorage.getItem('token');
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp < Date.now() / 1000;
    } catch {
      return true;
    }
  }
};

// Async thunks diretti senza service layer
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', credentials);

      // response è già la data, non response.data
      authHelpers.saveAuth(response.user, response.token);
      return response.user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Errore durante il login');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData: { name: string; email: string; password: string; birthdate?: string; existingTeamId?: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/register', userData);

      // response è già la data, non response.data
      authHelpers.saveAuth(response.user, response.token);
      return response.user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Errore durante la registrazione');
    }
  }
);

export const refreshUserData = createAsyncThunk(
  'auth/refreshUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/auth/me');

      // I dati ricchi arrivano in response.user
      const enrichedUser = response.user;

      // Salva i dati ricchi nel localStorage
      localStorage.setItem('user', JSON.stringify(enrichedUser));
      return enrichedUser;
    } catch (error: any) {
      authHelpers.clearAuth();
      return rejectWithValue(error.message || 'Errore durante il refresh');
    }
  }
);

// Thunk per caricare dati ricchi da /auth/me (NUOVO)
export const loadEnrichedUserData = createAsyncThunk(
  'auth/loadEnrichedUserData',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/auth/me');

      if (response.success && response.user) {
        // Salva i dati ricchi nel localStorage
        localStorage.setItem('user', JSON.stringify(response.user));
        return response.user;
      } else {
        return rejectWithValue('Dati utente non disponibili');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Errore caricamento dati ricchi');
    }
  }
);

// Thunk per aggiornare profilo utente
export const updateUserProfile = createAsyncThunk(
  'auth/updateUserProfile',
  async (profileData: { name: string; email: string; birthdate: string }, { rejectWithValue }) => {
    try {
      const response = await api.put('/auth/profile', profileData);

      if (response.success && response.user) {
        // Aggiorna localStorage con i nuovi dati
        localStorage.setItem('user', JSON.stringify(response.user));
        return response.user;
      } else {
        return rejectWithValue(response.message || 'Errore aggiornamento profilo');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Errore aggiornamento profilo');
    }
  }
);

// Thunk per cambiare password
export const changeUserPassword = createAsyncThunk(
  'auth/changeUserPassword',
  async (passwordData: { currentPassword: string; newPassword: string }, { rejectWithValue }) => {
    try {
      const response = await api.put('/auth/password', {
        oldPassword: passwordData.currentPassword,  // Backend si aspetta 'oldPassword'
        newPassword: passwordData.newPassword
      });

      // Se arriviamo qui, la chiamata è riuscita (status 200)
      if (response.success) {
        return { message: response.message || 'Password cambiata con successo' };
      } else {
        // Risposta 200 ma success: false
        return rejectWithValue(response.error || response.message || 'Errore cambio password');
      }
    } catch (error: any) {
      console.error('🔴 Errore changeUserPassword:', error);

      // Errore HTTP (4xx, 5xx) o errore di rete
      // apiCall lancia eccezioni per questi casi
      return rejectWithValue(error.message || 'Errore del server. Riprova più tardi.');
    }
  }
);

// Helper per decodificare il payload JWT senza librerie
const decodeJwtPayload = (token: string): Record<string, any> | null => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
};

export const guestLogin = createAsyncThunk(
  'auth/guestLogin',
  async ({ inviteToken }: { inviteToken: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/guest-login', { inviteToken });
      authHelpers.saveAuth(response.user, response.token);
      const payload = decodeJwtPayload(response.token);
      return { user: response.user, matchId: payload?.matchId || null };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Errore login ospite');
    }
  }
);

export const promoteGuestByInviteToken = createAsyncThunk(
  'auth/promoteGuestByInviteToken',
  async (data: { email: string; password: string; name: string; inviteToken: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/promote-guest-by-invite-token', data);
      authHelpers.saveAuth(response.user, response.token);
      return response.user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Errore registrazione ospite');
    }
  }
);

// Converte guest autenticato (JWT) in utente reale — senza inviteToken
export const promoteGuestById = createAsyncThunk(
  'auth/promoteGuestById',
  async (data: { email: string; password: string; name: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/promote-guest-by-id', data);
      authHelpers.saveAuth(response.user, response.token);
      return response.user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Errore registrazione');
    }
  }
);

// Upload avatar utente
export const uploadAvatar = createAsyncThunk(
  'auth/uploadAvatar',
  async (blob: Blob, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('avatar', blob);

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/users/me/avatar`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error || 'Avatar upload failed');
      }

      const data = await response.json();

      // Salva l'utente aggiornato nel localStorage
      localStorage.setItem('user', JSON.stringify(data.user));

      return data.user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Errore upload avatar');
    }
  }
);

// Rimuovi avatar utente
export const deleteAvatar = createAsyncThunk(
  'auth/deleteAvatar',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.delete('/users/me/avatar');

      if (response.success && response.user) {
        // Salva l'utente aggiornato nel localStorage
        localStorage.setItem('user', JSON.stringify(response.user));
        return response.user;
      } else {
        return rejectWithValue(response.message || 'Avatar deletion failed');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Errore rimozione avatar');
    }
  }
);

// Stato iniziale
const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isGuest: false,
  guestMatchId: null,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    initializeAuth: (state) => {
      if (authHelpers.isAuthenticated() && !authHelpers.isTokenExpired()) {
        const storedUser = authHelpers.getStoredUser();
        if (storedUser) {
          state.user = storedUser;
          state.isAuthenticated = true;
          // Leggi scope e matchId dal JWT
          const token = localStorage.getItem('token');
          if (token) {
            const payload = decodeJwtPayload(token);
            state.isGuest = payload?.scope === 'guest';
            state.guestMatchId = payload?.matchId || null;
          }
        }
      } else {
        authHelpers.clearAuth();
      }

      state.isLoading = false;
      state.error = null;
    }, logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.isGuest = false;
      state.guestMatchId = null;
      state.error = null;

      authHelpers.clearAuth();
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        // Debug: vediamo cosa salviamo nello store
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.user = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = action.payload as string;
      })

    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.user = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = action.payload as string;
      })

    // Refresh user data
    builder
      .addCase(refreshUserData.pending, (state) => {
        // Non mostrare loading per refresh
      })
      .addCase(refreshUserData.fulfilled, (state, action) => {
        state.user = action.payload;
        state.error = null;
      })
      .addCase(refreshUserData.rejected, (state, action) => {
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
        authHelpers.clearAuth();
      })
      // Load enriched user data
      .addCase(loadEnrichedUserData.pending, (state) => {
        // Non mostrare loading se abbiamo già dati utente
        if (!state.user) {
          state.isLoading = true;
        }
      })
      .addCase(loadEnrichedUserData.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(loadEnrichedUserData.rejected, (state, action) => {
        // Non cancellare i dati esistenti, solo logga l'errore
        console.warn('Failed to load enriched data:', action.payload);
        state.isLoading = false;
      })

    // Update Profile
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

    // Change Password
    builder
      .addCase(changeUserPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changeUserPassword.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(changeUserPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Guest login
    builder
      .addCase(guestLogin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(guestLogin.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.isGuest = true;
        state.guestMatchId = action.payload.matchId;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(guestLogin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Promote guest by invite token (converti in full user dal link di invito)
    builder
      .addCase(promoteGuestByInviteToken.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(promoteGuestByInviteToken.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isGuest = false;
        state.guestMatchId = null;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(promoteGuestByInviteToken.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Promote guest by ID (via JWT, no inviteToken)
    builder
      .addCase(promoteGuestById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(promoteGuestById.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isGuest = false;
        state.guestMatchId = null;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(promoteGuestById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Upload avatar
    builder
      .addCase(uploadAvatar.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(uploadAvatar.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(uploadAvatar.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete avatar
    builder
      .addCase(deleteAvatar.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteAvatar.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(deleteAvatar.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { initializeAuth, logout, setLoading, clearError } = authSlice.actions;
export default authSlice.reducer;
export type { User, AuthState };