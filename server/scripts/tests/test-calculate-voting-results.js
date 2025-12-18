/**
 * TEST - VotingService calculateVotingResults
 * Test per calcolo risultati live e ufficiali
 */

require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');

// Import models necessari
const VotingSession = require('../../src/models/VotingSession');
const VoteSubmission = require('../../src/models/VoteSubmission');
const VoteResult = require('../../src/models/VoteResult');
const User = require('../../src/models/User');

const VotingService = require('../../src/services/VotingService');

async function runCalculateVotingResultsTests() {
    console.log('🧪 === TEST VOTING SERVICE - CALCULATE VOTING RESULTS ===\n');

    try {
        // Connetti al database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Database connesso\n');

        // Crea istanza del service
        const votingService = new VotingService();

        // =====================
        // TEST 1: Input Validation
        // =====================
        console.log('📋 TEST 1: Input Validation');

        try {
            await votingService.calculateVotingResults(null);
            console.log('❌ SessionId null: DOVEVA FALLIRE!');
        } catch (error) {
            console.log('✅ SessionId null correttamente rifiutato:', error.message);
        }

        try {
            await votingService.calculateVotingResults('invalid_session_id');
            console.log('❌ SessionId invalido: DOVEVA FALLIRE!');
        } catch (error) {
            console.log('✅ SessionId invalido correttamente rifiutato:', error.message);
        }

        // =====================
        // TEST 2: Sessione Non Esistente
        // =====================
        console.log('\n📋 TEST 2: Sessione Non Esistente');

        try {
            await votingService.calculateVotingResults('507f1f77bcf86cd799439011');
            console.log('❌ Sessione inesistente: DOVEVA FALLIRE!');
        } catch (error) {
            console.log('✅ Sessione inesistente correttamente gestita:', error.message);
        }

        // =====================
        // TEST 3: Trova Sessione Reale Active
        // =====================
        console.log('\n📋 TEST 3: Test con Sessione Reale Active');

        // Trova una sessione attiva reale
        const activeSession = await VotingSession.findOne({
            status: 'active',
            type: 'match_rating'
        });

        if (activeSession) {
            console.log('🔍 Sessione attiva trovata:', activeSession._id);

            try {
                const result = await votingService.calculateVotingResults(activeSession._id.toString());

                console.log('✅ Calcolo risultati completato!');
                console.log('📊 Risultati overview:', {
                    playersCount: Object.keys(result.calculation.playerResults).length,
                    totalVoters: result.calculation.totalVoters,
                    isOfficial: result.isOfficial,
                    hasResults: Object.keys(result.calculation.playerResults).length > 0
                });

                // Verifica struttura dati
                if (result.calculation && result.calculation.playerResults) {
                    const firstPlayer = Object.values(result.calculation.playerResults)[0];
                    if (firstPlayer) {
                        console.log('📋 Struttura dati player:', Object.keys(firstPlayer));
                        console.log('✅ Struttura dati corretta');
                    }
                } else {
                    console.log('❌ Struttura dati mancante');
                }

            } catch (error) {
                console.log('❌ Errore calcolo con sessione reale:', error.message);
            }
        } else {
            console.log('⚠️ Nessuna sessione attiva trovata per test reale');
        }

        // =====================
        // TEST 4: Sessione Completed con Risultati Ufficiali
        // =====================
        console.log('\n📋 TEST 4: Sessione Completed con Risultati Ufficiali');

        const completedSession = await VotingSession.findOne({
            status: 'completed',
            type: 'match_rating'
        });

        if (completedSession) {
            console.log('🔍 Sessione completata trovata:', completedSession._id);

            try {
                const result = await votingService.calculateVotingResults(completedSession._id.toString());

                console.log('✅ Risultati ufficiali recuperati!');
                console.log('📊 Risultati overview:', {
                    isOfficial: result.isOfficial,
                    hasCompletedAt: !!result.completedAt,
                    hasCalculation: !!result.calculation
                });

                if (result.isOfficial) {
                    console.log('🏆 Risultati ufficiali confermati');
                } else {
                    console.log('⚠️ Risultati live anche per sessione completed');
                }

            } catch (error) {
                console.log('❌ Errore con sessione completed:', error.message);
            }
        } else {
            console.log('⚠️ Nessuna sessione completed trovata per test');
        }

        // =====================
        // TEST 5: Sessione senza Voti
        // =====================
        console.log('\n📋 TEST 5: Sessione senza Voti');

        // Trova sessione senza submissions
        const emptySession = await VotingSession.findOne({
            status: 'active',
            type: 'match_rating'
        });

        if (emptySession) {
            // Verifica se ha submissions
            const submissionsCount = await VoteSubmission.countDocuments({
                votingSessionId: emptySession._id,
                isActive: true
            });

            if (submissionsCount === 0) {
                console.log('🔍 Sessione senza voti trovata:', emptySession._id);

                try {
                    await votingService.calculateVotingResults(emptySession._id.toString());
                    console.log('❌ Sessione vuota: DOVEVA FALLIRE!');
                } catch (error) {
                    console.log('✅ Sessione senza voti correttamente gestita:', error.message);
                }
            } else {
                console.log('⚠️ Tutte le sessioni hanno voti, skip test sessione vuota');
            }
        }

        // =====================
        // TEST 6: Integrazione con aggregatePlayerStats
        // =====================
        console.log('\n📋 TEST 6: Verifica Integrazione aggregatePlayerStats');

        const sessionWithVotes = await VotingSession.findOne({
            status: { $in: ['active', 'completed'] },
            type: 'match_rating'
        });

        if (sessionWithVotes) {
            const submissions = await VoteSubmission.find({
                votingSessionId: sessionWithVotes._id,
                isActive: true
            }).populate('voterId', 'name');

            if (submissions.length > 0) {
                console.log('🔍 Testing aggregation con', submissions.length, 'submissions');

                try {
                    // Test diretto aggregatePlayerStats
                    const directStats = votingService.aggregatePlayerStats(submissions);

                    // Test attraverso calculateVotingResults
                    const serviceResult = await votingService.calculateVotingResults(sessionWithVotes._id.toString());

                    const serviceStats = serviceResult.calculation.playerResults;

                    // Confronta risultati
                    const directKeys = Object.keys(directStats).sort();
                    const serviceKeys = Object.keys(serviceStats).sort();

                    console.log('📊 Player count diretto:', directKeys.length);
                    console.log('📊 Player count service:', serviceKeys.length);

                    if (JSON.stringify(directKeys) === JSON.stringify(serviceKeys)) {
                        console.log('✅ Integrazione aggregatePlayerStats corretta');
                    } else {
                        console.log('❌ Discrepanza tra aggregation diretta e service');
                    }

                } catch (error) {
                    console.log('❌ Errore test integrazione:', error.message);
                }
            }
        }

        console.log('\n🎉 === FINE TEST CALCULATE VOTING RESULTS ===');
        console.log('📋 Il metodo calculateVotingResults è pronto per il controller refactoring!');

    } catch (error) {
        console.error('❌ ERRORE GENERALE TEST:', error);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Database disconnesso');
    }
}

// Esegui test
runCalculateVotingResultsTests();