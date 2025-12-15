/**
 * 🗳️ VOTING SLICE
 * Redux slice per gestire il nuovo sistema di votazione VotingSession
 * Sostituisce la vecchia logica di voting embedded nei match
 */

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../lib/api";
import {
    VotingState,
    VotingSession,
    VotingResult,
    CreateVotingSessionRequest,
    SubmitVoteRequest,
    VotingSessionsResponse,
    VotingSessionResponse,
    VotingResultsResponse,
    UpdateFiltersPayload,
    UpdateDraftVotePayload,
    VotingSessionStatus,
    VotingSessionType
} from "../../types/voting";

// =============================================
// 🌐 ASYNC THUNKS
// =============================================

// Carica le sessioni di votazione per l'utente corrente
export const fetchUserVotingSessions = createAsyncThunk(
    'voting/fetchUserSessions',
    async (params: {
        status?: VotingSessionStatus | 'all';
        type?: VotingSessionType | 'all';
        page?: number;
        limit?: number;
    } = {}, { rejectWithValue }) => {
        try {
            console.log('🔍 Caricamento sessioni di votazione utente...');

            const queryParams = new URLSearchParams();
            if (params.status && params.status !== 'all') queryParams.set('status', params.status);
            if (params.type && params.type !== 'all') queryParams.set('type', params.type);
            if (params.page) queryParams.set('page', params.page.toString());
            if (params.limit) queryParams.set('limit', params.limit.toString());

            // 🌐 API CALL REAL - Non più mock!
            const response = await api.get(`/voting-sessions?${queryParams.toString()}`);

            console.log('✅ Risposta API reale:', response);

            // Il backend restituisce { success: true, votingSessions: [] }
            // Adattiamo la risposta al formato atteso dal frontend
            return {
                sessions: response.votingSessions || [],
                pagination: { page: 1, limit: 10, total: response.votingSessions?.length || 0, pages: 1 }
            };
        } catch (error: any) {
            console.error('❌ Errore caricamento sessioni:', error);
            return rejectWithValue(error.message || 'Errore nel caricamento delle sessioni di votazione');
        }
    }
);

// Carica dettagli di una specifica sessione di votazione
export const fetchVotingSessionById = createAsyncThunk(
    'voting/fetchSessionById',
    async (sessionId: string, { rejectWithValue }) => {
        try {
            console.log('🔍 Caricamento dettagli sessione:', sessionId);

            const response: VotingSessionResponse = await api.get(`/voting-sessions/${sessionId}`);

            console.log('✅ Dettagli sessione caricati');

            return response.votingSession;
        } catch (error: any) {
            console.error('❌ Errore caricamento sessione:', error);
            return rejectWithValue(error.message || 'Errore nel caricamento della sessione');
        }
    }
);

// Crea una nuova sessione di votazione
export const createVotingSession = createAsyncThunk(
    'voting/createSession',
    async (sessionData: CreateVotingSessionRequest, { rejectWithValue }) => {
        try {
            console.log('🆕 Creazione nuova sessione di votazione:', sessionData.type);

            // 🔧 AUTO-MAP: Aggiungi targetType automaticamente se non presente
            const { getTargetTypeFromVotingType } = await import('../../types/voting');
            const requestData = {
                ...sessionData,
                targetType: sessionData.targetType || getTargetTypeFromVotingType(sessionData.type)
            };

            console.log('📤 Dati inviati al backend:', {
                type: requestData.type,
                targetType: requestData.targetType,
                targetId: requestData.targetId
            });

            // 🌐 API CALL REAL - Non più mock!
            const response = await api.post('/voting-sessions', requestData);

            console.log('✅ Risposta API reale creazione:', response);

            // Il backend restituisce { success: true, votingSession: {...} }
            // Adattiamo la struttura per il frontend
            const adaptedSession = {
                id: response.votingSession.id,
                type: response.votingSession.type,
                title: response.votingSession.title,
                description: response.votingSession.description,
                status: response.votingSession.status,
                targetType: response.votingSession.targetType,
                targetId: response.votingSession.targetId,
                createdAt: response.votingSession.createdAt,
                updatedAt: response.votingSession.createdAt, // Backend non restituisce updatedAt ancora
                deadline: response.votingSession.deadline,
                eligibleVoters: [], // Verrà popolato in futuro
                eligibleVotersCount: response.votingSession.eligibleVoters || 0,
                submissionsCount: 0,
                participationRate: 0,
                isActive: response.votingSession.status === 'active',
                hasVoted: false,
                canVote: false,
                teamId: '', // Verrà aggiunto in futuro
                createdBy: '' // Verrà aggiunto in futuro
            };

            console.log('✅ Sessione creata e adattata:', adaptedSession.id);

            return adaptedSession;
        } catch (error: any) {
            console.error('❌ Errore creazione sessione:', error);
            return rejectWithValue(error.message || 'Errore nella creazione della sessione');
        }
    }
);

// Invia un voto per una sessione
export const submitVote = createAsyncThunk(
    'voting/submitVote',
    async ({ sessionId, voteData }: { sessionId: string; voteData: SubmitVoteRequest }, { rejectWithValue }) => {
        try {
            console.log('🗳️ Invio voto per sessione:', sessionId);

            const response = await api.post(`/voting-sessions/${sessionId}/vote`, voteData);

            console.log('✅ Voto inviato con successo');

            return { sessionId, submission: response.submission };
        } catch (error: any) {
            console.error('❌ Errore invio voto:', error);
            return rejectWithValue(error.message || 'Errore nell\'invio del voto');
        }
    }
);

// Attiva una sessione di votazione (solo admin)
export const activateVotingSession = createAsyncThunk(
    'voting/activateSession',
    async (sessionId: string, { rejectWithValue }) => {
        try {
            console.log('🟢 Attivazione sessione:', sessionId);

            const response = await api.patch(`/voting-sessions/${sessionId}/activate`);

            console.log('✅ Sessione attivata');

            return { sessionId, updatedSession: response.votingSession };
        } catch (error: any) {
            console.error('❌ Errore attivazione sessione:', error);
            return rejectWithValue(error.message || 'Errore nell\'attivazione della sessione');
        }
    }
);

// Carica i risultati di una sessione completata
export const fetchVotingResults = createAsyncThunk(
    'voting/fetchResults',
    async (sessionId: string, { rejectWithValue }) => {
        try {
            console.log('📊 Caricamento risultati sessione:', sessionId);

            const response: VotingResultsResponse = await api.get(`/voting-sessions/${sessionId}/results`);

            console.log('✅ Risultati caricati');

            return { sessionId, results: response.results };
        } catch (error: any) {
            console.error('❌ Errore caricamento risultati:', error);
            return rejectWithValue(error.message || 'Errore nel caricamento dei risultati');
        }
    }
);

// =============================================
// 👥 TEAM MEMBERS ASYNC THUNKS
// =============================================

// Carica membri del team
export const fetchTeamMembers = createAsyncThunk(
    'voting/fetchTeamMembers',
    async (teamId: string, { rejectWithValue }) => {
        try {
            console.log('👥 Caricamento membri team:', teamId);
            const response = await api.get(`/teams/${teamId}`);
            console.log('✅ Team data caricato:', response);

            // Fix: usa memberIds invece di members e logga il contenuto
            const memberIds = response.team.memberIds || [];
            console.log('🔍 MemberIds trovati:', memberIds);
            console.log('📊 Numero membri:', memberIds.length);

            // Log dettagliato di ogni membro
            memberIds.forEach((member, index) => {
                console.log(`👤 Membro ${index + 1}:`, member);
            });

            return memberIds;
        } catch (error: any) {
            console.log('❌ ERRORE FETCH TEAM MEMBERS:', error.message);
            return rejectWithValue(error.message);
        }
    }
);

// 🃏 PLAYER CARD ASYNC THUNKS
// =============================================

// Crea una nuova sessione di valutazione player card
export const createPlayerCardSession = createAsyncThunk(
    'voting/createPlayerCardSession',
    async (data: {
        targetPlayerId: string;
        title?: string;
        description?: string;
        deadline?: string;
        teamId?: string;
    }, { rejectWithValue }) => {
        try {
            console.log('🃏 Creazione sessione player card per:', data.targetPlayerId);

            const response = await api.post('/player-cards/sessions', data);

            console.log('✅ Sessione player card creata:', response.votingSession.id);
            console.log('🔄 Auto-open flag ricevuto:', response.autoOpenVoteForm);

            // 🎯 RITORNA L'INTERA RESPONSE per avere autoOpenVoteForm
            return response;
        } catch (error: any) {
            console.error('❌ Errore creazione sessione player card:', error);
            return rejectWithValue(error.message || 'Errore nella creazione della sessione player card');
        }
    }
);

// Carica le sessioni player card per l'utente corrente
export const fetchPlayerCardSessions = createAsyncThunk(
    'voting/fetchPlayerCardSessions',
    async (params: {
        status?: VotingSessionStatus | 'all';
        page?: number;
        limit?: number;
    } = {}, { rejectWithValue }) => {
        try {
            console.log('🔍 Caricamento sessioni player card...');

            const queryParams = new URLSearchParams();
            if (params.status && params.status !== 'all') queryParams.set('status', params.status);
            if (params.page) queryParams.set('page', params.page.toString());
            if (params.limit) queryParams.set('limit', params.limit.toString());

            console.log('🌐 URL chiamata:', `/player-cards/sessions?${queryParams.toString()}`);

            const response = await api.get(`/player-cards/sessions?${queryParams.toString()}`);

            console.log('✅ Sessioni player card caricate:', response.votingSessions?.length || 0);
            console.log('📋 Response completa:', response);

            return {
                sessions: response.votingSessions || [],
                pagination: { page: 1, limit: 10, total: response.total || 0, pages: 1 }
            };
        } catch (error: any) {
            console.error('❌ Errore caricamento sessioni player card:', error);
            console.error('🌐 Dettagli errore:', {
                message: error.message,
                status: error.status,
                url: error.config?.url,
                method: error.config?.method
            });
            return rejectWithValue(error.message || 'Errore nel caricamento delle sessioni player card');
        }
    }
);

// Carica dettagli di una specifica sessione player card
export const fetchPlayerCardSessionById = createAsyncThunk(
    'voting/fetchPlayerCardSessionById',
    async (sessionId: string, { rejectWithValue }) => {
        try {
            console.log('🔍 Caricamento dettagli sessione player card:', sessionId);

            const response = await api.get(`/player-cards/sessions/${sessionId}`);

            console.log('✅ Dettagli sessione player card caricati');

            return response.votingSession;
        } catch (error: any) {
            console.error('❌ Errore caricamento sessione player card:', error);
            return rejectWithValue(error.message || 'Errore nel caricamento della sessione player card');
        }
    }
);

// Invia un voto per una sessione player card
export const submitPlayerCardVote = createAsyncThunk(
    'voting/submitPlayerCardVote',
    async ({ sessionId, voteData }: {
        sessionId: string;
        voteData: {
            vote: {
                attributes: {
                    tir: number;
                    pas: number;
                    dri: number;
                    fin: number;
                    vis: number;
                    res: number;
                    for: number;
                };
                additionalAttributes?: {
                    piedeDebole?: number;
                    skill?: number;
                };
                playerProfile?: {
                    position?: string;
                };
                comment?: string;
            };
            deviceInfo?: {
                isMobile?: boolean;
                platform?: string;
                screenResolution?: string;
                browserLanguage?: string;
            };
            timeSpent?: number;
        }
    }, { rejectWithValue }) => {
        try {
            console.log('🃏 Invio voto player card per sessione:', sessionId);
            console.log('🌐 URL chiamata:', `/player-cards/sessions/${sessionId}/vote`);
            console.log('📤 Dati inviati:', voteData);

            const response = await api.post(`/player-cards/sessions/${sessionId}/vote`, voteData);

            console.log('✅ Voto player card inviato con successo');
            console.log('📋 Response ricevuta:', response);

            return { sessionId, submission: response.submission };
        } catch (error: any) {
            console.error('❌ Errore invio voto player card:', error);
            console.error('🌐 Dettagli errore completi:', {
                message: error.message,
                status: error.status,
                statusText: error.statusText,
                response: error.response?.data,
                config: {
                    url: error.config?.url,
                    method: error.config?.method,
                    data: error.config?.data
                }
            });
            return rejectWithValue(error.message || 'Errore nell\'invio del voto player card');
        }
    }
);

// Carica i risultati/calcoli di una sessione player card
export const fetchPlayerCardCalculation = createAsyncThunk(
    'voting/fetchPlayerCardCalculation',
    async (sessionId: string, { rejectWithValue }) => {
        try {
            console.log('📊 Caricamento calcoli player card per sessione:', sessionId);

            const response = await api.get(`/player-cards/sessions/${sessionId}/calculation`);

            console.log('✅ Calcoli player card caricati');

            return { sessionId, calculation: response.calculation };
        } catch (error: any) {
            console.error('❌ Errore caricamento calcoli player card:', error);
            return rejectWithValue(error.message || 'Errore nel caricamento dei calcoli player card');
        }
    }
);

// Completa una sessione player card
export const completePlayerCardSession = createAsyncThunk(
    'voting/completePlayerCardSession',
    async (data: {
        sessionId: string;
        forceReopen?: boolean;
    }, { rejectWithValue }) => {
        try {
            console.log('🏁 Completamento sessione player card:', data.sessionId);

            const response = await api.post(`/player-cards/sessions/${data.sessionId}/complete`, {
                forceReopen: data.forceReopen || false
            });

            console.log('✅ Sessione player card completata');

            return { sessionId: data.sessionId, completedSession: response.votingSession };
        } catch (error: any) {
            console.error('❌ Errore completamento sessione player card:', error);
            return rejectWithValue(error.message || 'Errore nel completamento della sessione player card');
        }
    }
);

// =============================================
// ⚽ MATCH VOTING ASYNC THUNKS
// =============================================

// 🧮 Fetch calculation (medie finali) per match voting
export const fetchMatchVotingCalculation = createAsyncThunk(
    'voting/fetchMatchCalculation',
    async (sessionId: string, { rejectWithValue }) => {
        try {
            console.log('📡 Match Voting -> fetchCalculation:', sessionId);
            const response = await api.get(`/voting-sessions/${sessionId}/calculation`);
            console.log('✅ Match Calculation response:', response.calculation?.totalVoters || 0, 'voters');

            return {
                sessionId,
                calculation: response.calculation,
                isOfficial: response.isOfficial
            };
        } catch (error: any) {
            console.error('❌ Error fetchMatchCalculation:', error);
            return rejectWithValue(error.message || 'Errore nel recupero dei risultati match');
        }
    }
);

// 🗳️ Fetch submissions (voti individuali) per match voting  
export const fetchMatchVotingSubmissions = createAsyncThunk(
    'voting/fetchMatchSubmissions',
    async (sessionId: string, { rejectWithValue }) => {
        try {
            console.log('📡 Match Voting -> fetchSubmissions:', sessionId);
            const response = await api.get(`/voting-sessions/${sessionId}/submissions`);
            console.log('✅ Match Submissions response:', response.submissions?.length || 0, 'submissions');

            return {
                sessionId,
                submissions: response.submissions,
                totalSubmissions: response.totalSubmissions
            };
        } catch (error: any) {
            console.error('❌ Error fetchMatchSubmissions:', error);
            return rejectWithValue(error.message || 'Errore nel recupero dei voti individuali match');
        }
    }
);

// 🔄 Fetch both calculation and submissions per match voting
export const fetchMatchVotingData = createAsyncThunk(
    'voting/fetchMatchData',
    async (sessionId: string, { dispatch, rejectWithValue }) => {
        try {
            console.log('🚀 Match Voting -> fetchData (both APIs):', sessionId);

            // Chiama entrambe le API in parallelo
            const results = await Promise.allSettled([
                dispatch(fetchMatchVotingCalculation(sessionId)).unwrap(),
                dispatch(fetchMatchVotingSubmissions(sessionId)).unwrap()
            ]);

            const [calculationResult, submissionsResult] = results;

            console.log('✅ Match voting data fetch completed');
            console.log('📊 Calculation success:', calculationResult.status === 'fulfilled');
            console.log('🗳️ Submissions success:', submissionsResult.status === 'fulfilled');

            return { sessionId, success: true };

        } catch (error: any) {
            console.error('❌ Error fetchMatchVotingData:', error);
            return rejectWithValue(error.message || 'Errore nel recupero dei dati match voting');
        }
    }
);

// =============================================
// 🏪 INITIAL STATE
// =============================================

const initialState: VotingState = {
    // Sessioni di votazione
    sessions: [],
    currentSession: null,

    // Team Members
    teamMembers: [],

    // Loading states
    isLoading: false,
    isLoadingSessions: false,
    isLoadingSession: false,
    isSubmittingVote: false,
    isCreatingSession: false,
    isLoadingTeamMembers: false,

    // Error states
    error: null,
    loadError: null,
    submitError: null,
    createError: null,

    // Filtri e paginazione
    filters: {
        status: 'all',
        type: 'all'
    },
    pagination: {
        page: 1,
        limit: 10,
        total: 0,
        pages: 0
    },

    // Cache risultati
    results: {},

    // Draft votes per auto-save
    draftVotes: {},

    // ⚽ Match voting data
    matchVoting: {
        calculation: null,
        submissions: [],
        isLoading: false,
        error: null,
        lastFetched: null,
        currentSessionId: null
    }
};

// =============================================
// 🍰 VOTING SLICE
// =============================================

const votingSlice = createSlice({
    name: 'voting',
    initialState,
    reducers: {
        // Aggiorna filtri per la lista sessioni
        updateFilters: (state, action: PayloadAction<UpdateFiltersPayload>) => {
            state.filters = { ...state.filters, ...action.payload };
            state.pagination.page = 1; // Reset alla prima pagina
        },

        // Cambia pagina
        setPage: (state, action: PayloadAction<number>) => {
            state.pagination.page = action.payload;
        },

        // Salva draft del voto (auto-save)
        updateDraftVote: (state, action: PayloadAction<UpdateDraftVotePayload>) => {
            const { sessionId, draftVote } = action.payload;
            state.draftVotes[sessionId] = draftVote;
        },

        // Rimuovi draft vote
        clearDraftVote: (state, action: PayloadAction<string>) => {
            const sessionId = action.payload;
            delete state.draftVotes[sessionId];
        },

        // Reset dello stato
        resetVotingState: () => initialState,

        // Pulisci errori
        clearErrors: (state) => {
            state.error = null;
            state.submitError = null;
        },

        // Aggiorna sessione corrente locale (per real-time updates)
        updateCurrentSessionLocal: (state, action: PayloadAction<Partial<VotingSession>>) => {
            if (state.currentSession) {
                state.currentSession = { ...state.currentSession, ...action.payload };
            }

            // Aggiorna anche nella lista se presente
            const sessionIndex = state.sessions.findIndex(s => s.id === state.currentSession?.id);
            if (sessionIndex !== -1 && state.currentSession) {
                state.sessions[sessionIndex] = state.currentSession;
            }
        },

        // Ordina sessioni
        sortSessions: (state, action: PayloadAction<'date' | 'type' | 'status'>) => {
            const sortBy = action.payload;

            state.sessions.sort((a, b) => {
                switch (sortBy) {
                    case 'date':
                        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    case 'type':
                        return a.type.localeCompare(b.type);
                    case 'status':
                        return a.status.localeCompare(b.status);
                    default:
                        return 0;
                }
            });
        },

        // Pulisci sessioni
        clearSessions: (state) => {
            state.sessions = [];
            state.currentSession = null;
        },

        // ⚽ Clear match voting data (per reset o cambio match)
        clearMatchVotingData: (state) => {
            state.matchVoting.calculation = null;
            state.matchVoting.submissions = [];
            state.matchVoting.error = null;
            state.matchVoting.currentSessionId = null;
            state.matchVoting.lastFetched = null;
        },

        // 🔄 Reset match voting error
        resetMatchVotingError: (state) => {
            state.matchVoting.error = null;
        }
    },

    extraReducers: (builder) => {
        // ============================================= 
        // 👥 FETCH TEAM MEMBERS
        // =============================================
        builder
            .addCase(fetchTeamMembers.pending, (state) => {
                state.isLoadingTeamMembers = true;
                state.error = null;
            })
            .addCase(fetchTeamMembers.fulfilled, (state, action) => {
                state.isLoadingTeamMembers = false;
                state.teamMembers = action.payload;
                console.log(`✅ Caricati ${action.payload.length} team members`);
            })
            .addCase(fetchTeamMembers.rejected, (state, action) => {
                state.isLoadingTeamMembers = false;
                state.error = action.payload as string;
                console.log('❌ Errore caricamento team members:', action.payload);
            });

        // ============================================= 
        // 📥 FETCH USER VOTING SESSIONS
        // =============================================
        builder
            .addCase(fetchUserVotingSessions.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchUserVotingSessions.fulfilled, (state, action) => {
                state.sessions = action.payload.sessions;
                state.pagination = action.payload.pagination;
                state.isLoading = false;
                console.log(`✅ Caricate ${action.payload.sessions.length} sessioni di votazione`);
            })
            .addCase(fetchUserVotingSessions.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });

        // =============================================
        // 🔍 FETCH VOTING SESSION BY ID
        // =============================================
        builder
            .addCase(fetchVotingSessionById.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchVotingSessionById.fulfilled, (state, action) => {
                state.currentSession = action.payload;
                state.isLoading = false;

                // Aggiorna anche nella lista se presente
                const sessionIndex = state.sessions.findIndex(s => s.id === action.payload.id);
                if (sessionIndex !== -1) {
                    state.sessions[sessionIndex] = action.payload;
                }

                console.log('✅ Dettagli sessione caricati:', action.payload.title);
            })
            .addCase(fetchVotingSessionById.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });

        // =============================================
        // 🆕 CREATE VOTING SESSION
        // =============================================
        builder
            .addCase(createVotingSession.pending, (state) => {
                state.isCreatingSession = true;
                state.error = null;
            })
            .addCase(createVotingSession.fulfilled, (state, action) => {
                state.sessions.unshift(action.payload); // Aggiungi all'inizio
                state.currentSession = action.payload;
                state.isCreatingSession = false;
                console.log('✅ Sessione creata:', action.payload.title);
            })
            .addCase(createVotingSession.rejected, (state, action) => {
                state.isCreatingSession = false;
                state.error = action.payload as string;
            });

        // =============================================
        // 🗳️ SUBMIT VOTE
        // =============================================
        builder
            .addCase(submitVote.pending, (state) => {
                state.isSubmittingVote = true;
                state.submitError = null;
            })
            .addCase(submitVote.fulfilled, (state, action) => {
                const { sessionId } = action.payload;

                // Aggiorna la sessione corrente
                if (state.currentSession?.id === sessionId) {
                    state.currentSession.hasVoted = true;
                    state.currentSession.canVote = false;
                    state.currentSession.submissionsCount += 1;
                }

                // Aggiorna nella lista
                const sessionIndex = state.sessions.findIndex(s => s.id === sessionId);
                if (sessionIndex !== -1) {
                    state.sessions[sessionIndex].hasVoted = true;
                    state.sessions[sessionIndex].canVote = false;
                    state.sessions[sessionIndex].submissionsCount += 1;
                }

                // Rimuovi draft vote
                delete state.draftVotes[sessionId];

                state.isSubmittingVote = false;
                console.log('✅ Voto inviato per sessione:', sessionId);
            })
            .addCase(submitVote.rejected, (state, action) => {
                state.isSubmittingVote = false;
                state.submitError = action.payload as string;
            });

        // =============================================
        // 🟢 ACTIVATE VOTING SESSION
        // =============================================
        builder
            .addCase(activateVotingSession.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(activateVotingSession.fulfilled, (state, action) => {
                const { sessionId, updatedSession } = action.payload;

                // Aggiorna la sessione corrente
                if (state.currentSession?.id === sessionId) {
                    state.currentSession = { ...state.currentSession, ...updatedSession };
                }

                // Aggiorna nella lista
                const sessionIndex = state.sessions.findIndex(s => s.id === sessionId);
                if (sessionIndex !== -1) {
                    state.sessions[sessionIndex] = { ...state.sessions[sessionIndex], ...updatedSession };
                }

                state.isLoading = false;
                console.log('✅ Sessione attivata:', sessionId);
            })
            .addCase(activateVotingSession.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });

        // =============================================
        // 📊 FETCH VOTING RESULTS
        // =============================================
        builder
            .addCase(fetchVotingResults.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchVotingResults.fulfilled, (state, action) => {
                const { sessionId, results } = action.payload;

                // Salva i risultati nella cache
                state.results[sessionId] = results;

                state.isLoading = false;
                console.log('✅ Risultati caricati per sessione:', sessionId);
            })
            .addCase(fetchVotingResults.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });

        // =============================================
        // 🃏 PLAYER CARD SESSION REDUCERS
        // =============================================

        // CREATE PLAYER CARD SESSION
        builder
            .addCase(createPlayerCardSession.pending, (state) => {
                state.isCreatingSession = true;
                state.error = null;
            })
            .addCase(createPlayerCardSession.fulfilled, (state, action) => {
                // 🎯 La response ora contiene: { playerCardRequest, votingSession, autoOpenVoteForm }
                const { votingSession } = action.payload;
                state.sessions.unshift(votingSession); // Aggiungi la voting session all'inizio
                state.currentSession = votingSession;
                state.isCreatingSession = false;
                console.log('✅ Sessione player card creata:', votingSession.title);
                console.log('🔄 Auto-open flag disponibile nel payload:', action.payload.autoOpenVoteForm);
            })
            .addCase(createPlayerCardSession.rejected, (state, action) => {
                state.isCreatingSession = false;
                state.error = action.payload as string;
            });

        // FETCH PLAYER CARD SESSIONS
        builder
            .addCase(fetchPlayerCardSessions.pending, (state) => {
                state.isLoadingSessions = true;
                state.error = null;
            })
            .addCase(fetchPlayerCardSessions.fulfilled, (state, action) => {
                state.sessions = action.payload.sessions;
                state.pagination = action.payload.pagination;
                state.isLoadingSessions = false;
                console.log(`✅ Caricate ${action.payload.sessions.length} sessioni player card`);
            })
            .addCase(fetchPlayerCardSessions.rejected, (state, action) => {
                state.isLoadingSessions = false;
                state.error = action.payload as string;
            });

        // FETCH PLAYER CARD SESSION BY ID
        builder
            .addCase(fetchPlayerCardSessionById.pending, (state) => {
                state.isLoadingSession = true;
                state.error = null;
            })
            .addCase(fetchPlayerCardSessionById.fulfilled, (state, action) => {
                state.currentSession = action.payload;
                state.isLoadingSession = false;

                // Aggiorna anche nella lista se presente
                const sessionIndex = state.sessions.findIndex(s => s.id === action.payload.id);
                if (sessionIndex !== -1) {
                    state.sessions[sessionIndex] = action.payload;
                }

                console.log('✅ Dettagli sessione player card caricati:', action.payload.title);
            })
            .addCase(fetchPlayerCardSessionById.rejected, (state, action) => {
                state.isLoadingSession = false;
                state.error = action.payload as string;
            });

        // SUBMIT PLAYER CARD VOTE
        builder
            .addCase(submitPlayerCardVote.pending, (state) => {
                state.isSubmittingVote = true;
                state.submitError = null;
            })
            .addCase(submitPlayerCardVote.fulfilled, (state, action) => {
                const { sessionId } = action.payload;

                // Aggiorna la sessione corrente
                if (state.currentSession?.id === sessionId) {
                    state.currentSession.hasVoted = true;
                    state.currentSession.canVote = false;
                    state.currentSession.submissionsCount += 1;
                }

                // Aggiorna nella lista
                const sessionIndex = state.sessions.findIndex(s => s.id === sessionId);
                if (sessionIndex !== -1) {
                    state.sessions[sessionIndex].hasVoted = true;
                    state.sessions[sessionIndex].canVote = false;
                    state.sessions[sessionIndex].submissionsCount += 1;
                }

                // Rimuovi draft vote
                delete state.draftVotes[sessionId];

                state.isSubmittingVote = false;
                console.log('✅ Voto player card inviato per sessione:', sessionId);
            })
            .addCase(submitPlayerCardVote.rejected, (state, action) => {
                state.isSubmittingVote = false;
                state.submitError = action.payload as string;
            });

        // FETCH PLAYER CARD CALCULATION
        builder
            .addCase(fetchPlayerCardCalculation.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchPlayerCardCalculation.fulfilled, (state, action) => {
                const { sessionId, calculation } = action.payload;

                // Salva i calcoli nella cache results
                state.results[sessionId] = calculation;

                state.isLoading = false;
                console.log('✅ Calcoli player card caricati per sessione:', sessionId);
            })
            .addCase(fetchPlayerCardCalculation.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });

        // COMPLETE PLAYER CARD SESSION
        builder
            .addCase(completePlayerCardSession.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(completePlayerCardSession.fulfilled, (state, action) => {
                const { sessionId, completedSession } = action.payload;

                // Aggiorna la sessione corrente
                if (state.currentSession?.id === sessionId) {
                    state.currentSession = { ...state.currentSession, ...completedSession };
                }

                // Aggiorna nella lista
                const sessionIndex = state.sessions.findIndex(s => s.id === sessionId);
                if (sessionIndex !== -1) {
                    state.sessions[sessionIndex] = { ...state.sessions[sessionIndex], ...completedSession };
                }

                state.isLoading = false;
                console.log('✅ Sessione player card completata:', sessionId);
            })
            .addCase(completePlayerCardSession.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });

        // =============================================
        // ⚽ MATCH VOTING REDUCERS
        // =============================================

        // FETCH MATCH CALCULATION
        builder
            .addCase(fetchMatchVotingCalculation.pending, (state) => {
                state.matchVoting.isLoading = true;
                state.matchVoting.error = null;
            })
            .addCase(fetchMatchVotingCalculation.fulfilled, (state, action) => {
                state.matchVoting.isLoading = false;
                state.matchVoting.calculation = {
                    playerResults: action.payload.calculation.playerResults,
                    totalVoters: action.payload.calculation.totalVoters,
                    sessionId: action.payload.sessionId,
                    isOfficial: action.payload.isOfficial
                };
                state.matchVoting.currentSessionId = action.payload.sessionId;
                state.matchVoting.lastFetched = new Date().toISOString();
            })
            .addCase(fetchMatchVotingCalculation.rejected, (state, action) => {
                state.matchVoting.isLoading = false;
                state.matchVoting.error = action.payload as string;
            })

            // FETCH MATCH SUBMISSIONS
            .addCase(fetchMatchVotingSubmissions.pending, (state) => {
                state.matchVoting.isLoading = true;
                state.matchVoting.error = null;
            })
            .addCase(fetchMatchVotingSubmissions.fulfilled, (state, action) => {
                state.matchVoting.isLoading = false;
                state.matchVoting.submissions = action.payload.submissions;
                state.matchVoting.currentSessionId = action.payload.sessionId;
                state.matchVoting.lastFetched = new Date().toISOString();
            })
            .addCase(fetchMatchVotingSubmissions.rejected, (state, action) => {
                state.matchVoting.isLoading = false;
                state.matchVoting.error = action.payload as string;
            })

            // FETCH MATCH DATA (both)
            .addCase(fetchMatchVotingData.pending, (state) => {
                state.matchVoting.isLoading = true;
                state.matchVoting.error = null;
            })
            .addCase(fetchMatchVotingData.fulfilled, (state, action) => {
                state.matchVoting.isLoading = false;
                state.matchVoting.currentSessionId = action.payload.sessionId;
                state.matchVoting.lastFetched = new Date().toISOString();
            })
            .addCase(fetchMatchVotingData.rejected, (state, action) => {
                state.matchVoting.isLoading = false;
                state.matchVoting.error = action.payload as string;
            });
    },
});

// =============================================
// 🎯 SELECTORS DERIVATI
// =============================================

// Team Members Selectors
export const selectTeamMembers = (state: { voting: VotingState }) => state.voting.teamMembers;
export const selectIsLoadingTeamMembers = (state: { voting: VotingState }) => state.voting.isLoadingTeamMembers;

// Selettore per sessioni filtrate
export const selectFilteredVotingSessions = (state: { voting: VotingState }) => {
    const { sessions, filters } = state.voting;

    return sessions.filter(session => {
        const statusMatch = !filters.status || filters.status === 'all' || session.status === filters.status;
        const typeMatch = !filters.type || filters.type === 'all' || session.type === filters.type;
        return statusMatch && typeMatch;
    });
};

// Selettore per sessioni attive (include draft per testing)
export const selectActiveVotingSessions = (state: { voting: VotingState }) => {
    return state.voting.sessions.filter(session =>
        (session.status === 'active' || session.status === 'draft') && session.canVote
    );
};

// Selettore per sessioni pendenti voto utente (include draft per testing)
export const selectPendingVoteSessions = (state: { voting: VotingState }) => {
    return state.voting.sessions.filter(session =>
        (session.status === 'active' || session.status === 'draft') &&
        !session.hasVoted && session.canVote
    );
};

// Selettore per sessioni completate
export const selectCompletedVotingSessions = (state: { voting: VotingState }) => {
    return state.voting.sessions.filter(session => session.status === 'completed');
};

// Selettore per statistiche dashboard
export const selectVotingDashboardStats = (state: { voting: VotingState }) => {
    const sessions = state.voting.sessions;

    return {
        totalSessions: sessions.length,
        activeSessions: sessions.filter(s => s.status === 'active').length,
        pendingVotes: sessions.filter(s => s.status === 'active' && !s.hasVoted && s.canVote).length,
        completedSessions: sessions.filter(s => s.status === 'completed').length,
        votesGiven: sessions.filter(s => s.hasVoted).length
    };
};

// Selettore per risultati di una sessione specifica
export const selectVotingResults = (sessionId: string) => (state: { voting: VotingState }) => {
    return state.voting.results[sessionId] || null;
};

// Selettore per draft vote di una sessione
export const selectDraftVote = (sessionId: string) => (state: { voting: VotingState }) => {
    return state.voting.draftVotes[sessionId] || null;
};

// =============================================
// 🃏 PLAYER CARD SELECTORS
// =============================================

// Selettore per sessioni player card
export const selectPlayerCardSessions = (state: { voting: VotingState }) => {
    return state.voting.sessions.filter(session => session.type === 'player_card_rating');
};

// Selettore per sessioni player card attive
export const selectActivePlayerCardSessions = (state: { voting: VotingState }) => {
    return state.voting.sessions.filter(session =>
        session.type === 'player_card_rating' &&
        (session.status === 'active' || session.status === 'draft') &&
        session.canVote
    );
};

// Selettore per sessioni player card pendenti voto utente
export const selectPendingPlayerCardSessions = (state: { voting: VotingState }) => {
    return state.voting.sessions.filter(session =>
        session.type === 'player_card_rating' &&
        (session.status === 'active' || session.status === 'draft') &&
        !session.hasVoted && session.canVote
    );
};

// Selettore per sessioni player card completate
export const selectCompletedPlayerCardSessions = (state: { voting: VotingState }) => {
    return state.voting.sessions.filter(session =>
        session.type === 'player_card_rating' && session.status === 'completed'
    );
};

// Selettore per calcoli player card di una sessione specifica
export const selectPlayerCardCalculation = (sessionId: string) => (state: { voting: VotingState }) => {
    return state.voting.results[sessionId] || null;
};

// Selettore per statistiche dashboard player card
export const selectPlayerCardDashboardStats = (state: { voting: VotingState }) => {
    const playerCardSessions = state.voting.sessions.filter(s => s.type === 'player_card_rating');

    return {
        totalPlayerCardSessions: playerCardSessions.length,
        activePlayerCardSessions: playerCardSessions.filter(s => s.status === 'active').length,
        pendingPlayerCardVotes: playerCardSessions.filter(s => s.status === 'active' && !s.hasVoted && s.canVote).length,
        completedPlayerCardSessions: playerCardSessions.filter(s => s.status === 'completed').length,
        playerCardsGiven: playerCardSessions.filter(s => s.hasVoted).length
    };
};

// =============================================
// 📤 EXPORTS
// =============================================

export const {
    updateFilters,
    setPage,
    updateDraftVote,
    clearDraftVote,
    resetVotingState,
    clearErrors,
    updateCurrentSessionLocal,
    sortSessions,
    clearSessions,
    clearMatchVotingData,
    resetMatchVotingError
} = votingSlice.actions;

export default votingSlice.reducer;