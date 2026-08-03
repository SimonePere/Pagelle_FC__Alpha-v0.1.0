const User = require('../../models/User');
const Team = require('../../models/Team');
const Match = require('../../models/Match');
const VotingSession = require('../../models/VotingSession');
const VoteSubmission = require('../../models/VoteSubmission');
const VoteResult = require('../../models/VoteResult');
const PlayerCardSubmission = require('../../models/PlayerCardSubmission');
const Award = require('../../models/Award');
const KpiSnapshot = require('../../god/models/KpiSnapshot');

class GodRepository {

    // ─── Snapshot KPI ────────────────────────────────────────────────────────

    async getLatestSnapshot(rangeKey = '30d', bucketType = 'hourly') {
        return KpiSnapshot.findOne({ rangeKey, bucketType }).sort({ bucketStart: -1 }).lean();
    }

    async upsertSnapshot({ bucketType, bucketStart, bucketEnd, rangeKey, metrics }) {
        return KpiSnapshot.findOneAndUpdate(
            { bucketType, bucketStart, rangeKey },
            { bucketType, bucketStart, bucketEnd, rangeKey, metrics },
            { upsert: true, new: true }
        );
    }

    // ─── Conteggi base ───────────────────────────────────────────────────────

    async countUsers(filter = {}) { return User.countDocuments(filter); }
    async countTeams(filter = {}) { return Team.countDocuments(filter); }
    async countMatches(filter = {}) { return Match.countDocuments(filter); }
    async countVotingSessions(filter = {}) { return VotingSession.countDocuments(filter); }
    async countVoteSubmissions(filter = {}) { return VoteSubmission.countDocuments(filter); }
    async countPlayerCardSubmissions(filter = {}) { return PlayerCardSubmission.countDocuments(filter); }
    async countAwards(filter = {}) { return Award.countDocuments(filter); }

    // ─── Utenti ──────────────────────────────────────────────────────────────

    // Utenti con isGuest=true presenti nel DB oggi
    async countGuestUsers() {
        return User.countDocuments({ isGuest: true });
    }

    // Proxy "attivi": distinct voterIds su entrambi i tipi di submission nell'arco di 7 giorni
    async countActiveUsers7d() {
        const since = new Date(Date.now() - 7 * 86400000);
        const [voteVoters, cardVoters] = await Promise.all([
            VoteSubmission.distinct('voterId', { createdAt: { $gte: since } }),
            PlayerCardSubmission.distinct('voterId', { createdAt: { $gte: since } }),
        ]);
        const unique = new Set([...voteVoters.map(String), ...cardVoters.map(String)]);
        return unique.size;
    }

    // ─── Partite ─────────────────────────────────────────────────────────────

    // Sessioni match_rating attive in questo momento
    async countOpenVotingSessions() {
        return VotingSession.countDocuments({ status: 'active', type: 'match_rating' });
    }

    // ─── Gameplay (gol, assist, voto medio) ──────────────────────────────────

    // Aggrega gol/assist dal DETTAGLIO per-giocatore (matchRatingResults), non dal
    // riassunto statistics.* che storicamente non veniva popolato alla chiusura.
    // Questa è la stessa fonte-verità da cui la home ricava i totali via
    // PlayerSeasonStats. Il voto medio resta preso da statistics.overallAverageRating
    // (che è sempre stato calcolato correttamente). Filtrato per createdAt → range-aware.
    async aggregateGameplayStats({ start, end }) {
        const [result] = await VoteResult.aggregate([
            { $match: { createdAt: { $gte: start, $lte: end } } },
            {
                $facet: {
                    // Somma gol/assist scorrendo la Map matchRatingResults per-giocatore
                    players: [
                        { $project: { players: { $objectToArray: '$matchRatingResults' } } },
                        { $unwind: '$players' },
                        {
                            $group: {
                                _id: null,
                                totalGoals: { $sum: '$players.v.goals' },
                                totalAssists: { $sum: '$players.v.assists' },
                            }
                        },
                    ],
                    // Media dei voti a livello di partita
                    rating: [
                        {
                            $group: {
                                _id: null,
                                avgRatingSum: { $sum: '$statistics.overallAverageRating' },
                                count: { $sum: 1 },
                            }
                        },
                    ],
                }
            },
        ]);
        const players = result?.players?.[0] || { totalGoals: 0, totalAssists: 0 };
        const rating = result?.rating?.[0] || { avgRatingSum: 0, count: 0 };
        return {
            totalGoals: players.totalGoals || 0,
            totalAssists: players.totalAssists || 0,
            avgRating: rating.count > 0
                ? Math.round((rating.avgRatingSum / rating.count) * 100) / 100
                : 0,
        };
    }

    // ─── Badge ───────────────────────────────────────────────────────────────

    // Conta i badge dal DETTAGLIO per-giocatore (matchRatingResults[].badges),
    // stessa fonte-verità dei gol/assist. Filtrato per createdAt → range-aware.
    async aggregateBadgesCount({ start, end }) {
        const groups = await VoteResult.aggregate([
            { $match: { createdAt: { $gte: start, $lte: end } } },
            { $project: { players: { $objectToArray: '$matchRatingResults' } } },
            { $unwind: '$players' },
            { $unwind: '$players.v.badges' },
            { $group: { _id: '$players.v.badges', count: { $sum: 1 } } },
        ]);
        const breakdown = {
            mvp: 0, goleador: 0, assist_man: 0,
            difensore: 0, maratoneta: 0, gol_bello: 0,
        };
        for (const g of groups) {
            if (breakdown[g._id] !== undefined) breakdown[g._id] = g.count;
        }
        const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
        return { total, breakdown };
    }

    // ─── Award analytics ─────────────────────────────────────────────────────

    // Aggrega $sum su Award.stats.* e conta quanti PENDING nel range dato
    async aggregateAwardStats({ start, end }) {
        const [result] = await Award.aggregate([
            { $match: { generatedAt: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: null,
                    pending: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } },
                    views: { $sum: '$stats.views' },
                    shareNative: { $sum: '$stats.shareClicks.native' },
                    shareWhatsapp: { $sum: '$stats.shareClicks.whatsapp' },
                    shareTelegram: { $sum: '$stats.shareClicks.telegram' },
                    shareCopyLink: { $sum: '$stats.shareClicks.copyLink' },
                    shareDownload: { $sum: '$stats.shareClicks.download' },
                    publicPageVisits: { $sum: '$stats.publicPageVisits' },
                }
            },
        ]);
        if (!result) return { pending: 0, viewed: 0, shared: 0, publicVisits: 0, downloads: 0 };
        return {
            pending: result.pending,
            viewed: result.views,
            shared: result.shareNative + result.shareWhatsapp + result.shareTelegram + result.shareCopyLink,
            publicVisits: result.publicPageVisits,
            downloads: result.shareDownload,
        };
    }

    // ─── Engagement ──────────────────────────────────────────────────────────

    // Metriche aggregate di engagement per votazioni nel range dato
    async aggregateVotingEngagement({ start, end }) {
        const [sessions, submissions, completed] = await Promise.all([
            VotingSession.countDocuments({ type: 'match_rating', createdAt: { $gte: start, $lte: end } }),
            VoteSubmission.countDocuments({ createdAt: { $gte: start, $lte: end } }),
            VotingSession.countDocuments({ type: 'match_rating', status: 'completed', createdAt: { $gte: start, $lte: end } }),
        ]);

        // participationRate media: aggregazione su summary.participationRate delle sessioni completate
        const [participationResult] = await VotingSession.aggregate([
            { $match: { type: 'match_rating', status: 'completed', createdAt: { $gte: start, $lte: end } } },
            { $group: { _id: null, avgParticipation: { $avg: '$summary.participationRate' } } },
        ]);

        const activeUsers = await this.countActiveUsers7d();

        return {
            sessionsCreated: sessions,
            submissions,
            completionRate: sessions > 0 ? Math.round((completed / sessions) * 1000) / 10 : 0,
            avgParticipationRate: participationResult
                ? Math.round((participationResult.avgParticipation ?? 0) * 10) / 10
                : 0,
            activeUsers7d: activeUsers,
        };
    }

    // Metriche aggregate di engagement per player cards nel range dato
    async aggregatePlayerCardEngagement({ start, end }) {
        const [sessions, submissions, completed] = await Promise.all([
            VotingSession.countDocuments({ type: 'player_card_rating', createdAt: { $gte: start, $lte: end } }),
            PlayerCardSubmission.countDocuments({ createdAt: { $gte: start, $lte: end } }),
            VotingSession.countDocuments({ type: 'player_card_rating', status: 'completed', createdAt: { $gte: start, $lte: end } }),
        ]);
        return {
            sessionsCreated: sessions,
            submissions,
            completionRate: sessions > 0 ? Math.round((completed / sessions) * 1000) / 10 : 0,
        };
    }

    // ─── Top team ────────────────────────────────────────────────────────────

    // Top N team per numero di partite create nel range dato
    // Match.teamId è String, quindi usa $toObjectId per il lookup su Team
    async getTopTeams({ limit = 5, start, end } = {}) {
        const matchFilter = (start && end) ? { createdAt: { $gte: start, $lte: end } } : {};
        return Match.aggregate([
            { $match: matchFilter },
            { $group: { _id: '$teamId', matchCount: { $sum: 1 } } },
            { $sort: { matchCount: -1 } },
            { $limit: limit },
            { $addFields: { teamIdObj: { $toObjectId: '$_id' } } },
            {
                $lookup: {
                    from: 'teams',
                    localField: 'teamIdObj',
                    foreignField: '_id',
                    as: 'teamDoc',
                }
            },
            { $unwind: { path: '$teamDoc', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    teamId: '$_id',
                    teamName: { $ifNull: ['$teamDoc.name', 'Team sconosciuto'] },
                    memberCount: { $size: { $ifNull: ['$teamDoc.memberIds', []] } },
                    matchCount: 1,
                }
            },
        ]);
    }

    // ─── Timeseries per grafico ───────────────────────────────────────────────

    // Aggrega conteggi per bucket temporale (giorno o ora) su Match, VoteSubmission, PlayerCardSubmission
    async getTimeSeriesData({ start, end, granularity = 'day' }) {
        const fmt = granularity === 'hour' ? '%Y-%m-%dT%H:00' : '%Y-%m-%d';
        const bucketStage = (dateField) => ({
            $group: {
                _id: { $dateToString: { format: fmt, date: dateField } },
                count: { $sum: 1 },
            }
        });

        const [matchRows, voteRows, cardRows] = await Promise.all([
            Match.aggregate([
                { $match: { createdAt: { $gte: start, $lte: end } } },
                bucketStage('$createdAt'),
                { $sort: { _id: 1 } },
            ]),
            VoteSubmission.aggregate([
                { $match: { createdAt: { $gte: start, $lte: end } } },
                bucketStage('$createdAt'),
                { $sort: { _id: 1 } },
            ]),
            PlayerCardSubmission.aggregate([
                { $match: { createdAt: { $gte: start, $lte: end } } },
                bucketStage('$createdAt'),
                { $sort: { _id: 1 } },
            ]),
        ]);

        // Unione ordinata delle etichette presenti in almeno una serie
        const labelsSet = new Set([
            ...matchRows.map(r => r._id),
            ...voteRows.map(r => r._id),
            ...cardRows.map(r => r._id),
        ]);
        const labels = [...labelsSet].sort();

        const toMap = rows => Object.fromEntries(rows.map(r => [r._id, r.count]));
        const mMap = toMap(matchRows);
        const vMap = toMap(voteRows);
        const cMap = toMap(cardRows);

        return {
            labels,
            series: [
                { key: 'matches', label: 'Partite', data: labels.map(l => mMap[l] || 0) },
                { key: 'votes', label: 'Voti', data: labels.map(l => vMap[l] || 0) },
                { key: 'playerCards', label: 'Player Cards', data: labels.map(l => cMap[l] || 0) },
            ],
        };
    }

    // ─── Audit (rimandato) ────────────────────────────────────────────────────

    // GodUsageLog non ancora implementato — restituisce array vuoto per ora
    async getGodUsage({ limit = 100 }) {
        return [];
    }
}

module.exports = GodRepository;