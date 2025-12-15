import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../lib/api";
import { User } from "../../types/api";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
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
  async (userData: { name: string; email: string; password: string; birthdate?: string }, { rejectWithValue }) => {
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
      console.error('Error loading enriched user data:', error);
      return rejectWithValue(error.message || 'Errore caricamento dati ricchi');
    }
  }
);

// Stato iniziale
const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    initializeAuth: (state) => {
      console.log('Inizializzazione auth...');

      if (authHelpers.isAuthenticated() && !authHelpers.isTokenExpired()) {
        const storedUser = authHelpers.getStoredUser();
        if (storedUser) {
          state.user = storedUser;
          state.isAuthenticated = true;
          console.log('✅ Utente ripristinato:', storedUser.name || storedUser.username);
        }
      } else {
        authHelpers.clearAuth();
        console.log('❌ Token scaduto o non valido');
      }

      state.isLoading = false;
      state.error = null;
    }, logout: (state) => {
      console.log('Logout utente:', state.user?.username);

      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
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
        console.log('🔍 Saving to Redux store:', action.payload);

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
      });
  },
});

export const { initializeAuth, logout, setLoading, clearError } = authSlice.actions;
export default authSlice.reducer;
export type { User, AuthState };
export type { User, AuthState };