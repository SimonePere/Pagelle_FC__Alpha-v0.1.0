/**
 * News Slice
 * Gestisce lo stato delle news nell'app
 */

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../lib/api";
import { NewsItem, NewsResponse } from "../../types/news";

interface NewsState {
    news: NewsItem[];
    currentNews: NewsItem | null;
    isLoading: boolean;
    error: string | null;
    filter: {
        category: string;
        priority: string;
    };
    // Metadata da NewsResponse
    totalCount: number;
    lastTeamId: string | null;
    isCached: boolean;
}

// Async thunks
export const fetchRecentNews = createAsyncThunk(
    'news/fetchRecent',
    async (teamId: string, { rejectWithValue }) => {
        try {
            const response: NewsResponse = await api.get(`/news/${teamId}/recent`);

            if (!response.success) {
                return rejectWithValue('Errore nella risposta del server');
            }

            return response;
        } catch (error: any) {
            console.error('❌ Errore fetchRecentNews:', error);
            return rejectWithValue(error.message || 'Errore nel recupero delle news recenti');
        }
    }
);

export const fetchNewsByCategory = createAsyncThunk(
    'news/fetchByCategory',
    async ({ category, teamId }: { category: string; teamId?: string }, { rejectWithValue }) => {
        try {

            const response: NewsResponse = await api.get(`/news/${teamId}/category/${category}`);

            if (!response.success) {
                return rejectWithValue('Errore nella risposta del server');
            }

            return response;
        } catch (error: any) {
            console.error('❌ Errore fetchNewsByCategory:', error);
            return rejectWithValue(error.message || 'Errore nel recupero delle news per categoria');
        }
    }
);

export const fetchNewsByPriority = createAsyncThunk(
    'news/fetchByPriority',
    async ({ priority, teamId }: { priority: string; teamId?: string }, { rejectWithValue }) => {
        try {
            const response: NewsResponse = await api.get(`/news/${teamId}/priority/${priority}`);

            if (!response.success) {
                return rejectWithValue('Errore nella risposta del server');
            }

            return response;
        } catch (error: any) {
            console.error('❌ Errore fetchNewsByPriority:', error);
            return rejectWithValue(error.message || 'Errore nel recupero delle news per priorità');
        }
    }
);

export const fetchUrgentNews = createAsyncThunk(
    'news/fetchUrgent',
    async (teamId: string, { rejectWithValue }) => {
        try {

            const response: NewsResponse = await api.get(`/news/${teamId}/urgent`);

            if (!response.success) {
                return rejectWithValue('Errore nella risposta del server');
            }

            return response;
        } catch (error: any) {
            console.error('❌ Errore fetchUrgentNews:', error);
            return rejectWithValue(error.message || 'Errore nel recupero delle news urgenti');
        }
    }
);

export const fetchNewsById = createAsyncThunk(
    'news/fetchById',
    async (newsId: string, { rejectWithValue }) => {
        try {
            const response = await api.get(`/news/${newsId}`);
            return response.news;
        } catch (error: any) {
            console.error('❌ Errore fetchNewsById:', error);
            return rejectWithValue(error.message || 'Errore nel recupero della news');
        }
    }
);

export const deleteNews = createAsyncThunk(
    'news/delete',
    async (newsId: string, { rejectWithValue }) => {
        try {
            await api.delete(`/news/${newsId}`);
            return newsId;
        } catch (error: any) {
            console.error('❌ Errore deleteNews:', error);
            return rejectWithValue(error.message || 'Errore nell\'eliminazione della news');
        }
    }
);

const initialState: NewsState = {
    news: [],
    currentNews: null,
    isLoading: false,
    error: null,
    filter: {
        category: 'all',
        priority: 'all'
    },
    // Metadata da NewsResponse
    totalCount: 0,
    lastTeamId: null,
    isCached: false
};

const newsSlice = createSlice({
    name: 'news',
    initialState,
    reducers: {
        setCurrentNews: (state, action: PayloadAction<NewsItem | null>) => {
            state.currentNews = action.payload;
        },

        setFilter: (state, action: PayloadAction<Partial<NewsState['filter']>>) => {
            state.filter = { ...state.filter, ...action.payload };
        },

        clearError: (state) => {
            state.error = null;
        },

        clearNews: (state) => {
            state.news = [];
            state.currentNews = null;
        }
    },
    extraReducers: (builder) => {
        // fetchRecentNews
        builder
            .addCase(fetchRecentNews.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchRecentNews.fulfilled, (state, action) => {
                state.isLoading = false;
                const response = action.payload as NewsResponse;
                state.news = response.data;
                state.totalCount = response.count;
                state.lastTeamId = response.teamId;
                state.isCached = response.cached || false;
            })
            .addCase(fetchRecentNews.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })

            // fetchNewsByCategory
            .addCase(fetchNewsByCategory.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchNewsByCategory.fulfilled, (state, action) => {
                state.isLoading = false;
                const response = action.payload as NewsResponse;
                state.news = response.data;
                state.totalCount = response.count;
                state.lastTeamId = response.teamId;
                state.isCached = response.cached || false;
            })
            .addCase(fetchNewsByCategory.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })

            // fetchNewsByPriority
            .addCase(fetchNewsByPriority.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchNewsByPriority.fulfilled, (state, action) => {
                state.isLoading = false;
                const response = action.payload as NewsResponse;
                state.news = response.data;
                state.totalCount = response.count;
                state.lastTeamId = response.teamId;
                state.isCached = response.cached || false;
            })
            .addCase(fetchNewsByPriority.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })

            // fetchUrgentNews
            .addCase(fetchUrgentNews.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchUrgentNews.fulfilled, (state, action) => {
                state.isLoading = false;
                const response = action.payload as NewsResponse;
                state.news = response.data;
                state.totalCount = response.count;
                state.lastTeamId = response.teamId;
                state.isCached = response.cached || false;
            })
            .addCase(fetchUrgentNews.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })

            // fetchNewsById
            .addCase(fetchNewsById.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchNewsById.fulfilled, (state, action) => {
                state.isLoading = false;
                state.currentNews = action.payload;
            })
            .addCase(fetchNewsById.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })

            // deleteNews
            .addCase(deleteNews.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(deleteNews.fulfilled, (state, action) => {
                state.isLoading = false;
                state.news = state.news.filter(news => news._id !== action.payload);
                if (state.currentNews?._id === action.payload) {
                    state.currentNews = null;
                }
            })
            .addCase(deleteNews.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    }
});

export const { setCurrentNews, setFilter, clearError, clearNews } = newsSlice.actions;
export default newsSlice.reducer;
