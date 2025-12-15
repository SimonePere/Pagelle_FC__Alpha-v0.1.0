// controllers/leaderboardController.js
const PlayerLeaderboardStats = require('../models/PlayerLeaderboardStats');

/**
 * LEADERBOARD CONTROLLER
 * 
 * Gestisce tutte le classifiche per team:
 * - Rating (voto medio)
 * - Goals (gol totali) 
 * - Assists (assist totali)
 * - PlayerCard (overall rating)
 * - Form (forma recente)
 * 
 * 🎯 FIX: Tutti gli endpoint restituiscono gli stessi campi completi,
 * ma ordinati diversamente per tipo di classifica
 */

// Campi standard da restituire per ogni classifica
const STANDARD_FIELDS = 'playerId playerName totalMatches totalGoals totalAssists averageRating playerCardTOT playerCardAverage formRating recentForm';

// === CLASSIFICA RATING ===
exports.getRatingLeaderboard = async (req, res) => {
    try {
        const { teamId } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        const players = await PlayerLeaderboardStats
            .find({ teamId, isActive: true })
            .sort({ averageRating: -1 })
            .limit(limit)
            .select(STANDARD_FIELDS);

        res.json({
            success: true,
            data: players,
            type: 'rating'
        });

    } catch (error) {
        console.error('❌ Errore getRatingLeaderboard:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero classifica rating'
        });
    }
};

// === CLASSIFICA GOL ===
exports.getGoalsLeaderboard = async (req, res) => {
    try {
        const { teamId } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        const players = await PlayerLeaderboardStats
            .find({ teamId, isActive: true })
            .sort({ totalGoals: -1, averageRating: -1 }) // Tie-break con rating
            .limit(limit)
            .select(STANDARD_FIELDS);

        res.json({
            success: true,
            data: players,
            type: 'goals'
        });

    } catch (error) {
        console.error('❌ Errore getGoalsLeaderboard:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero classifica gol'
        });
    }
};

// === CLASSIFICA ASSIST ===
exports.getAssistsLeaderboard = async (req, res) => {
    try {
        const { teamId } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        const players = await PlayerLeaderboardStats
            .find({ teamId, isActive: true })
            .sort({ totalAssists: -1, averageRating: -1 }) // Tie-break con rating
            .limit(limit)
            .select(STANDARD_FIELDS);

        res.json({
            success: true,
            data: players,
            type: 'assists'
        });

    } catch (error) {
        console.error('❌ Errore getAssistsLeaderboard:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero classifica assist'
        });
    }
};

// === CLASSIFICA PLAYERCARD ===
exports.getPlayercardLeaderboard = async (req, res) => {
    try {
        const { teamId } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        const players = await PlayerLeaderboardStats
            .find({
                teamId,
                isActive: true,
                $or: [
                    { playerCardAverage: { $ne: null, $gt: 0 } },
                    { playerCardTOT: { $ne: null, $gt: 0 } }
                ]
            })
            .sort({ playerCardAverage: -1, playerCardTOT: -1 })
            .limit(limit)
            .select(STANDARD_FIELDS);

        res.json({
            success: true,
            data: players,
            type: 'playercard'
        });

    } catch (error) {
        console.error('❌ Errore getPlayercardLeaderboard:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero classifica playercard'
        });
    }
};

// === CLASSIFICA FORM ===
exports.getFormLeaderboard = async (req, res) => {
    try {
        const { teamId } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        // Trova giocatori con almeno 3 partite recenti o con formRating
        const players = await PlayerLeaderboardStats
            .find({
                teamId,
                isActive: true,
                $or: [
                    { formRating: { $ne: null, $gt: 0 } },
                    { $expr: { $gte: [{ $size: "$recentForm" }, 3] } }
                ]
            })
            .sort({ formRating: -1, averageRating: -1 }) // Ordina per formRating
            .limit(limit)
            .select(STANDARD_FIELDS);

        res.json({
            success: true,
            data: players,
            type: 'form'
        });

    } catch (error) {
        console.error('❌ Errore getFormLeaderboard:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero classifica form'
        });
    }
};

// === TUTTE LE CLASSIFICHE (OPZIONALE) ===
exports.getAllLeaderboards = async (req, res) => {
    try {
        const { teamId } = req.params;
        const limit = parseInt(req.query.limit) || 5;

        const [rating, goals, assists, playercard, form] = await Promise.all([
            PlayerLeaderboardStats.find({ teamId, isActive: true }).sort({ averageRating: -1 }).limit(limit).select(STANDARD_FIELDS),
            PlayerLeaderboardStats.find({ teamId, isActive: true }).sort({ totalGoals: -1, averageRating: -1 }).limit(limit).select(STANDARD_FIELDS),
            PlayerLeaderboardStats.find({ teamId, isActive: true }).sort({ totalAssists: -1, averageRating: -1 }).limit(limit).select(STANDARD_FIELDS),
            PlayerLeaderboardStats.find({ teamId, playerCardAverage: { $ne: null, $gt: 0 } }).sort({ playerCardAverage: -1 }).limit(limit).select(STANDARD_FIELDS),
            PlayerLeaderboardStats.find({ teamId, formRating: { $ne: null, $gt: 0 } }).sort({ formRating: -1 }).limit(limit).select(STANDARD_FIELDS)
        ]);

        res.json({
            success: true,
            data: { rating, goals, assists, playercard, form }
        });

    } catch (error) {
        console.error('❌ Errore getAllLeaderboards:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero classifiche'
        });
    }
};

module.exports = exports;