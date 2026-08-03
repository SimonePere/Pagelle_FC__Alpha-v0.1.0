import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../lib/api';
import type { RootState } from '../store/store';

// ─── Tipi response (allineati al backend GodKpiService) ──────────────────────

export type GodRangeKey = '7d' | '30d' | '90d' | 'total' | 'custom';
export type GodGranularity = 'day' | 'hour';

export interface GodOverviewData {
    source: 'live' | 'snapshot';
    range: GodRangeKey;
    generatedAt: string;
    metrics: {
        users: {
            totalRegistered: number;
            newInWindow: number;
            guestUsers: number;
            activeUsers7d: number;
        };
        teams: {
            total: number;
            createdInWindow: number;
        };
        matches: {
            total: number;
            createdInWindow: number;
            openVotingSessions: number;
        };
        voting: {
            sessionsCreatedInWindow: number;
            submissionsInWindow: number;
        };
        playerCards: {
            submissionsInWindow: number;
        };
        awards: {
            eventsInWindow: number;
        };
        gameplay: {
            totalGoals: number;
            totalAssists: number;
            avgRating: number;
            totalBadges: number;
            badgesBreakdown: Record<string, number>;
        };
    };
}

export interface GodDashboardGraphSeries {
    key: string;
    label: string;
    data: number[];
}

export interface GodDashboardGraphData {
    labels: string[];
    series: GodDashboardGraphSeries[];
}

export interface GodGuestConversionData {
    invited: number;
    guestLogins: number;
    promoted: number;
    conversionRate: number;
}

export interface GodEngagementVoting {
    sessionsCreated: number;
    submissions: number;
    completionRate: number;
    avgParticipationRate: number;
    activeUsers7d: number;
}

export interface GodEngagementPlayerCards {
    sessionsCreated: number;
    submissions: number;
    completionRate: number;
}

export interface GodEngagementData {
    voting: GodEngagementVoting;
    playerCards: GodEngagementPlayerCards;
}

export interface GodAwardsData {
    pending: number;
    viewed: number;
    shared: number;
    publicVisits: number;
    downloads: number;
}

export interface GodTopTeamItem {
    teamId: string;
    teamName: string;
    matchCount: number;
    memberCount: number;
}

export interface GodUsageItem {
    userId: string;
    path: string;
    method: string;
    statusCode: number;
    latencyMs: number;
    query: Record<string, unknown>;
    userAgent: string;
    at: string;
}

// ─── Stato ───────────────────────────────────────────────────────────────────

type AsyncStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface GodEndpointState<T> {
    data: T | null;
    status: AsyncStatus;
    error: string | null;
    lastFetchedAt: string | null; // ISO, per decidere se ri-fetchare
}

function makeEndpointState<T>(): GodEndpointState<T> {
    return { data: null, status: 'idle', error: null, lastFetchedAt: null };
}

interface GodState {
    range: GodRangeKey;
    overview: GodEndpointState<GodOverviewData>;
    dashboardGraph: GodEndpointState<GodDashboardGraphData>;
    guestConversion: GodEndpointState<GodGuestConversionData>;
    engagement: GodEndpointState<GodEngagementData>;
    awards: GodEndpointState<GodAwardsData>;
    topTeams: GodEndpointState<GodTopTeamItem[]>;
    usage: GodEndpointState<GodUsageItem[]>;
}

const initialState: GodState = {
    range: '30d',
    overview: makeEndpointState(),
    dashboardGraph: makeEndpointState(),
    guestConversion: makeEndpointState(),
    engagement: makeEndpointState(),
    awards: makeEndpointState(),
    topTeams: makeEndpointState(),
    usage: makeEndpointState(),
};

// ─── Thunk params condivisi ───────────────────────────────────────────────────

type RangeParams = { range?: GodRangeKey };
type GraphParams = { range?: GodRangeKey; granularity?: GodGranularity };

// ─── Thunks ──────────────────────────────────────────────────────────────────

export const fetchGodOverview = createAsyncThunk(
    'god/fetchOverview',
    async ({ range = '30d' }: RangeParams = {}, { rejectWithValue }) => {
        try {
            const res = await api.get(`/god/overview?range=${range}`);
            return res.data as GodOverviewData;
        } catch (e: any) {
            return rejectWithValue(e.message ?? 'Errore overview god');
        }
    }
);

export const fetchGodDashboardGraph = createAsyncThunk(
    'god/fetchDashboardGraph',
    async ({ range = '90d', granularity = 'day' }: GraphParams = {}, { rejectWithValue }) => {
        try {
            const res = await api.get(`/god/dashboard-graph-data?range=${range}&granularity=${granularity}`);
            return res.data as GodDashboardGraphData;
        } catch (e: any) {
            return rejectWithValue(e.message ?? 'Errore dashboard graph god');
        }
    }
);

export const fetchGodGuestConversion = createAsyncThunk(
    'god/fetchGuestConversion',
    async ({ range = '30d' }: RangeParams = {}, { rejectWithValue }) => {
        try {
            const res = await api.get(`/god/guest-conversion?range=${range}`);
            return res.data as GodGuestConversionData;
        } catch (e: any) {
            return rejectWithValue(e.message ?? 'Errore guest conversion god');
        }
    }
);

export const fetchGodEngagement = createAsyncThunk(
    'god/fetchEngagement',
    async ({ range = '30d' }: RangeParams = {}, { rejectWithValue }) => {
        try {
            const res = await api.get(`/god/engagement?range=${range}`);
            return res.data as GodEngagementData;
        } catch (e: any) {
            return rejectWithValue(e.message ?? 'Errore engagement god');
        }
    }
);

export const fetchGodAwards = createAsyncThunk(
    'god/fetchAwards',
    async ({ range = '30d' }: RangeParams = {}, { rejectWithValue }) => {
        try {
            const res = await api.get(`/god/awards?range=${range}`);
            return res.data as GodAwardsData;
        } catch (e: any) {
            return rejectWithValue(e.message ?? 'Errore awards kpi god');
        }
    }
);

export const fetchGodTopTeams = createAsyncThunk(
    'god/fetchTopTeams',
    async ({ range = '30d', limit = 5 }: RangeParams & { limit?: number } = {}, { rejectWithValue }) => {
        try {
            const res = await api.get(`/god/top-teams?range=${range}&limit=${limit}`);
            return res.data as GodTopTeamItem[];
        } catch (e: any) {
            return rejectWithValue(e.message ?? 'Errore top teams god');
        }
    }
);

export const fetchGodUsage = createAsyncThunk(
    'god/fetchUsage',
    async ({ limit = 50 }: { limit?: number } = {}, { rejectWithValue }) => {
        try {
            const res = await api.get(`/god/audit/usage?limit=${limit}`);
            return res.data as GodUsageItem[];
        } catch (e: any) {
            return rejectWithValue(e.message ?? 'Errore usage god');
        }
    }
);

// Lancia in parallelo overview + graph + engagement + awards per il range selezionato
export const fetchGodDashboardAll = createAsyncThunk(
    'god/fetchDashboardAll',
    async ({ range = '30d' }: RangeParams = {}, { dispatch }) => {
        await Promise.all([
            dispatch(fetchGodOverview({ range })),
            dispatch(fetchGodDashboardGraph({ range: range === '7d' ? '30d' : range })),
            dispatch(fetchGodEngagement({ range })),
            dispatch(fetchGodAwards({ range })),
            dispatch(fetchGodTopTeams({ range })),
        ]);
    }
);

// ─── Helper per i casi pending/fulfilled/rejected (evita ripetizioni) ─────────

function addEndpointCases<T>(
    builder: any,
    thunk: any,
    key: keyof GodState,
) {
    builder
        .addCase(thunk.pending, (state: GodState) => {
            (state[key] as GodEndpointState<T>).status = 'loading';
            (state[key] as GodEndpointState<T>).error = null;
        })
        .addCase(thunk.fulfilled, (state: GodState, action: any) => {
            (state[key] as GodEndpointState<T>).status = 'succeeded';
            (state[key] as GodEndpointState<T>).data = action.payload;
            (state[key] as GodEndpointState<T>).lastFetchedAt = new Date().toISOString();
        })
        .addCase(thunk.rejected, (state: GodState, action: any) => {
            (state[key] as GodEndpointState<T>).status = 'failed';
            (state[key] as GodEndpointState<T>).error = action.payload as string;
        });
}

// ─── Slice ───────────────────────────────────────────────────────────────────

const godSlice = createSlice({
    name: 'god',
    initialState,
    reducers: {
        setRange(state, action: { payload: GodRangeKey }) {
            state.range = action.payload;
        },
        resetGodState() {
            return initialState;
        },
    },
    extraReducers: (builder) => {
        addEndpointCases(builder, fetchGodOverview, 'overview');
        addEndpointCases(builder, fetchGodDashboardGraph, 'dashboardGraph');
        addEndpointCases(builder, fetchGodGuestConversion, 'guestConversion');
        addEndpointCases(builder, fetchGodEngagement, 'engagement');
        addEndpointCases(builder, fetchGodAwards, 'awards');
        addEndpointCases(builder, fetchGodTopTeams, 'topTeams');
        addEndpointCases(builder, fetchGodUsage, 'usage');
    },
});

export const { setRange, resetGodState } = godSlice.actions;
export default godSlice.reducer;

// ─── Selectors ───────────────────────────────────────────────────────────────
// Ogni selector restituisce il valore con fallback sicuro (no undefined nella UI)

export const selectGodRange = (s: RootState) => s.god.range;

// Overview
export const selectGodOverview = (s: RootState) => s.god.overview.data;
export const selectGodOverviewStatus = (s: RootState) => s.god.overview.status;

export const selectGodUsersKpi = (s: RootState) => s.god.overview.data?.metrics.users ?? null;
export const selectGodTeamsKpi = (s: RootState) => s.god.overview.data?.metrics.teams ?? null;
export const selectGodMatchesKpi = (s: RootState) => s.god.overview.data?.metrics.matches ?? null;
export const selectGodVotingKpi = (s: RootState) => s.god.overview.data?.metrics.voting ?? null;
export const selectGodPlayerCardsKpi = (s: RootState) => s.god.overview.data?.metrics.playerCards ?? null;
export const selectGodGameplayKpi = (s: RootState) => s.god.overview.data?.metrics.gameplay ?? null;
export const selectGodAwardsEventsKpi = (s: RootState) => s.god.overview.data?.metrics.awards ?? null;
export const selectGodOverviewSource = (s: RootState) => s.god.overview.data?.source ?? null;

// Dashboard graph
export const selectGodDashboardGraph = (s: RootState) => s.god.dashboardGraph.data;
export const selectGodDashboardGraphStatus = (s: RootState) => s.god.dashboardGraph.status;

// Guest conversion
export const selectGodGuestConversion = (s: RootState) => s.god.guestConversion.data;
export const selectGodGuestCount = (s: RootState) => s.god.guestConversion.data?.guestLogins ?? null;

// Engagement
export const selectGodEngagement = (s: RootState) => s.god.engagement.data;
export const selectGodEngagementStatus = (s: RootState) => s.god.engagement.status;
export const selectGodVotingEngagement = (s: RootState) => s.god.engagement.data?.voting ?? null;
export const selectGodPlayerCardsEngagement = (s: RootState) => s.god.engagement.data?.playerCards ?? null;

// Awards kpi
export const selectGodAwardsKpi = (s: RootState) => s.god.awards.data;
export const selectGodAwardsStatus = (s: RootState) => s.god.awards.status;

// Top teams
export const selectGodTopTeams = (s: RootState) => s.god.topTeams.data ?? [];
export const selectGodTopTeamsStatus = (s: RootState) => s.god.topTeams.status;

// Usage
export const selectGodUsage = (s: RootState) => s.god.usage.data ?? [];
export const selectGodUsageStatus = (s: RootState) => s.god.usage.status;

// Selector combinato: true se almeno un endpoint è in loading
export const selectGodAnyLoading = (s: RootState) =>
    (['overview', 'dashboardGraph', 'engagement', 'awards'] as const)
        .some(k => s.god[k].status === 'loading');

// ─── Mappa UI -> API (solo per reference, non usata a runtime) ───────────────

export const godEndpointPaths = {
    overview: '/god/overview',
    dashboardGraphData: '/god/dashboard-graph-data',
    guestConversion: '/god/guest-conversion',
    engagement: '/god/engagement',
    awards: '/god/awards',
    topTeams: '/god/top-teams',
    usage: '/god/audit/usage',
} as const;

// ─── Tabella UI -> endpoint -> campo (reference per sviluppo) ────────────────

export interface GodDashboardUiMappingRow {
    uiSection: string;
    uiPiece: string;
    endpoint: string;
    responseField: string;
    currentPlaceholderValue: string;
    toImplement: boolean;
}

// Regola rapida: numeri/card => overview|engagement|awards|guestConversion | grafici => dashboardGraphData | tabella => usage
export const godDashboardUiMapping: GodDashboardUiMappingRow[] = [
    {
        uiSection: 'Team & Partite',
        uiPiece: 'Team totali',
        endpoint: '/api/v1/god/overview?range=30d',
        responseField: 'data.metrics.teams.total',
        currentPlaceholderValue: 'reale',
        toImplement: false,
    },
    {
        uiSection: 'Team & Partite',
        uiPiece: 'Partite totali',
        endpoint: '/api/v1/god/overview?range=30d',
        responseField: 'data.metrics.matches.total',
        currentPlaceholderValue: 'reale',
        toImplement: false,
    },
    {
        uiSection: 'Team & Partite',
        uiPiece: 'Partite nel periodo',
        endpoint: '/api/v1/god/overview?range=30d',
        responseField: 'data.metrics.matches.createdInWindow',
        currentPlaceholderValue: 'reale',
        toImplement: false,
    },
    {
        uiSection: 'Team & Partite',
        uiPiece: 'In attesa di voti',
        endpoint: '/api/v1/god/engagement?range=30d oppure overview estesa',
        responseField: 'manca oggi',
        currentPlaceholderValue: 'placeholder locale',
        toImplement: true,
    },
    {
        uiSection: 'Utenti & Giocatori',
        uiPiece: 'Utenti registrati',
        endpoint: '/api/v1/god/overview?range=30d',
        responseField: 'data.metrics.users.totalRegistered',
        currentPlaceholderValue: 'reale',
        toImplement: false,
    },
    {
        uiSection: 'Utenti & Giocatori',
        uiPiece: 'Nuovi utenti nel periodo',
        endpoint: '/api/v1/god/overview?range=30d',
        responseField: 'data.metrics.users.newInWindow',
        currentPlaceholderValue: 'reale',
        toImplement: false,
    },
    {
        uiSection: 'Utenti & Giocatori',
        uiPiece: 'Attivi 7 giorni',
        endpoint: '/api/v1/god/engagement?range=7d',
        responseField: 'data.voting.activeUsers7d',
        currentPlaceholderValue: '0 placeholder',
        toImplement: true,
    },
    {
        uiSection: 'Utenti & Giocatori',
        uiPiece: 'Giocatori ospiti',
        endpoint: '/api/v1/god/guest-conversion?range=30d oppure overview estesa',
        responseField: 'data.guestLogins oppure un campo guestUsers dedicato',
        currentPlaceholderValue: '0 placeholder',
        toImplement: true,
    },
    {
        uiSection: 'Utenti & Giocatori',
        uiPiece: 'Inviti pendenti',
        endpoint: '/api/v1/god/guest-conversion?range=30d',
        responseField: 'manca oggi; probabile campo dedicated pendingInvites',
        currentPlaceholderValue: '0 placeholder',
        toImplement: true,
    },
    {
        uiSection: 'Engagement & Contenuti',
        uiPiece: 'Voti partita totali nel periodo',
        endpoint: '/api/v1/god/overview?range=30d oppure /god/engagement?range=30d',
        responseField: 'data.metrics.voting.submissionsInWindow oppure data.voting.submissions',
        currentPlaceholderValue: 'reale in overview',
        toImplement: false,
    },
    {
        uiSection: 'Engagement & Contenuti',
        uiPiece: 'Player card submissions nel periodo',
        endpoint: '/api/v1/god/overview?range=30d',
        responseField: 'data.metrics.playerCards.submissionsInWindow',
        currentPlaceholderValue: 'reale',
        toImplement: false,
    },
    {
        uiSection: 'Engagement & Contenuti',
        uiPiece: 'Player card create / complete',
        endpoint: '/api/v1/god/engagement?range=30d',
        responseField: 'data.playerCards.sessionsCreated / completionRate',
        currentPlaceholderValue: 'placeholder locale',
        toImplement: true,
    },
    {
        uiSection: 'Engagement & Contenuti',
        uiPiece: 'Badge assegnati',
        endpoint: 'nessun endpoint god completo oggi',
        responseField: 'manca oggi',
        currentPlaceholderValue: '0 placeholder',
        toImplement: true,
    },
    {
        uiSection: 'Engagement & Contenuti',
        uiPiece: 'Conversioni paid',
        endpoint: 'nessun endpoint god completo oggi',
        responseField: 'manca oggi',
        currentPlaceholderValue: '0 placeholder',
        toImplement: true,
    },
    {
        uiSection: 'Statistiche di Gioco',
        uiPiece: 'Gol totali',
        endpoint: 'overview estesa oppure endpoint dedicato gameplay',
        responseField: 'manca oggi',
        currentPlaceholderValue: '0 placeholder',
        toImplement: true,
    },
    {
        uiSection: 'Statistiche di Gioco',
        uiPiece: 'Assist totali',
        endpoint: 'overview estesa oppure endpoint dedicato gameplay',
        responseField: 'manca oggi',
        currentPlaceholderValue: '0 placeholder',
        toImplement: true,
    },
    {
        uiSection: 'Statistiche di Gioco',
        uiPiece: 'Voto medio',
        endpoint: 'overview estesa oppure endpoint dedicato gameplay',
        responseField: 'manca oggi',
        currentPlaceholderValue: '0 placeholder',
        toImplement: true,
    },
    {
        uiSection: 'Grafico trend',
        uiPiece: 'Trend ultime 8 settimane',
        endpoint: '/api/v1/god/dashboard-graph-data?range=90d&granularity=day',
        responseField: 'data.labels + data.series[]',
        currentPlaceholderValue: 'placeholder locale',
        toImplement: true,
    },
    {
        uiSection: 'Top team / distribuzioni',
        uiPiece: 'Registrati vs ospiti',
        endpoint: '/api/v1/god/guest-conversion?range=30d oppure overview estesa',
        responseField: 'manca oggi una shape precisa per pie chart',
        currentPlaceholderValue: 'placeholder locale',
        toImplement: true,
    },
    {
        uiSection: 'Top team / distribuzioni',
        uiPiece: 'Top 5 team per attivita',
        endpoint: 'manca endpoint dedicato, consigliato /api/v1/god/top-teams?range=30d',
        responseField: 'manca oggi',
        currentPlaceholderValue: 'placeholder locale',
        toImplement: true,
    },
    {
        uiSection: 'Audit tecnico',
        uiPiece: 'Ultime chiamate API god',
        endpoint: '/api/v1/god/audit/usage?limit=50',
        responseField: 'data[]',
        currentPlaceholderValue: 'non affidabile finche audit non e completato',
        toImplement: true,
    },
];

// Ordine consigliato di implementazione
export const godImplementationOrder = [
    'overview',
    'dashboardGraphData',
    'engagement',
    'guestConversion',
    'awards',
    'usage',
] as const;
