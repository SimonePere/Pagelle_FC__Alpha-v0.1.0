/**
 * TEST - VotingService createVotingSession
 * Test per creazione sessioni votazione con business rules
 */

require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');

// Import models necessari
const VotingSession = require('../../src/models/VotingSession');
const Match = require('../../src/models/Match');
const Team = require('../../src/models/Team');
const User = require('../../src/models/User');

const VotingService = require('../../src/services/VotingService');

async function runCreateVotingSessionTests() {
    console.log('🧪 === TEST VOTING SERVICE - CREATE VOTING SESSION ===\n');

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
            await votingService.createVotingSession(null, {});
            console.log('❌ UserData null: DOVEVA FALLIRE!');
        } catch (error) {
            console.log('✅ UserData null correttamente rifiutato:', error.message);
        }

        try {
            await votingService.createVotingSession({ id: 'user123' }, {});
            console.log('❌ SessionData vuoto: DOVEVA FALLIRE!');
        } catch (error) {
            console.log('✅ TargetId mancante correttamente rifiutato:', error.message);
        }

        try {
            await votingService.createVotingSession({}, { targetId: 'match123' });
            console.log('❌ UserData senza ID: DOVEVA FALLIRE!');
        } catch (error) {
            console.log('✅ UserData senza ID correttamente rifiutato:', error.message);
        }

        // =====================
        // TEST 2: Match Non Esistente
        // =====================
        console.log('\n📋 TEST 2: Match Non Esistente');

        try {
            await votingService.createVotingSession(
                { id: '507f1f77bcf86cd799439011' },
                { targetId: '507f1f77bcf86cd799439012' }
            );
            console.log('❌ Match inesistente: DOVEVA FALLIRE!');
        } catch (error) {
            console.log('✅ Match inesistente correttamente gestito:', error.message);
        }

        // =====================
        // TEST 3: Trova Match Reale
        // =====================
        console.log('\n📋 TEST 3: Test con Match Reale');

        // Trova un match reale
        const realMatch = await Match.findOne().populate('teamId');

        if (realMatch) {
            console.log('🔍 Match reale trovato:', realMatch._id);
            console.log('🔍 Team associato:', realMatch.teamId?._id);

            if (realMatch.teamId) {
                try {
                    const result = await votingService.createVotingSession(
                        { id: '507f1f77bcf86cd799439013' }, // User ID fittizio
                        {
                            targetId: realMatch._id.toString(),
                            title: 'Test Session',
                            description: 'Test Description'
                        }
                    );

                    console.log('✅ Sessione creata con successo!');
                    console.log('📊 Risultato overview:', {
                        sessionId: result.session._id,
                        sessionType: result.session.type,
                        sessionStatus: result.session.status,
                        eligibleVotersCount: result.session.eligibleVoters.length,
                        hasMatchInfo: !!result.matchInfo,
                        targetMatch: result.session.targetId
                    });

                    // Verifica business rules
                    const { session } = result;

                    // Test 1: Type deve essere 'match_rating'
                    if (session.type === 'match_rating') {
                        console.log('✅ Business Rule: Type = match_rating');
                    } else {
                        console.log('❌ Business Rule: Type non corretto');
                    }

                    // Test 2: Status deve essere 'active'
                    if (session.status === 'active') {
                        console.log('✅ Business Rule: Status = active');
                    } else {
                        console.log('❌ Business Rule: Status non corretto');
                    }

                    // Test 3: EligibleVoters deve essere team.memberIds
                    const team = await Team.findById(realMatch.teamId);
                    if (team && session.eligibleVoters.length === team.memberIds.length) {
                        console.log('✅ Business Rule: EligibleVoters = team.memberIds');
                    } else {
                        console.log('❌ Business Rule: EligibleVoters non corretto');
                    }

                    // Test 4: VoteConfig deve avere defaults corretti
                    const voteConfig = session.voteConfig;
                    if (voteConfig.ratingRange.min === 1 &&
                        voteConfig.ratingRange.max === 10 &&
                        voteConfig.allowBadges === true) {
                        console.log('✅ Business Rule: VoteConfig defaults corretti');
                    } else {
                        console.log('❌ Business Rule: VoteConfig defaults errati');
                    }

                    // Test 5: Title default se non fornito
                    if (session.title === 'Test Session') {
                        console.log('✅ Business Rule: Title custom mantenuto');
                    } else {
                        console.log('❌ Business Rule: Title custom non mantenuto');
                    }

                    // Cleanup - rimuovi sessione test
                    await VotingSession.findByIdAndDelete(session._id);
                    console.log('🧹 Sessione test rimossa');

                } catch (error) {
                    console.log('❌ Errore creazione con match reale:', error.message);
                }
            } else {
                console.log('⚠️ Match senza team associato, skip test');
            }
        } else {
            console.log('⚠️ Nessun match trovato per test reale');
        }

        // =====================
        // TEST 4: Team Non Esistente (Match Orfano)
        // =====================
        console.log('\n📋 TEST 4: Match con Team Non Esistente');

        // Crea match temporaneo con team inesistente
        const orphanMatch = await Match.create({
            teamId: new mongoose.Types.ObjectId(),
            opponent: 'Test Opponent',
            date: new Date(),
            field: 'Test Field',
            playersCount: 11,
            createdBy: new mongoose.Types.ObjectId() // Fix: campo required
        });

        try {
            await votingService.createVotingSession(
                { id: '507f1f77bcf86cd799439014' },
                { targetId: orphanMatch._id.toString() }
            );
            console.log('❌ Team inesistente: DOVEVA FALLIRE!');
        } catch (error) {
            console.log('✅ Team inesistente correttamente gestito:', error.message);
        } finally {
            // Cleanup
            await Match.findByIdAndDelete(orphanMatch._id);
            console.log('🧹 Match orfano rimosso');
        }

        // =====================
        // TEST 5: Title e Description Defaults
        // =====================
        console.log('\n📋 TEST 5: Title e Description Defaults');

        const matchForDefaults = await Match.findOne().populate('teamId');

        if (matchForDefaults && matchForDefaults.teamId) {
            try {
                const result = await votingService.createVotingSession(
                    { id: '507f1f77bcf86cd799439015' },
                    { targetId: matchForDefaults._id.toString() } // No title/description
                );

                const { session } = result;

                // Verifica defaults
                if (session.title.includes('Vota la partita vs')) {
                    console.log('✅ Title default generato correttamente');
                } else {
                    console.log('❌ Title default non corretto');
                }

                if (session.description.includes('Valuta le prestazioni')) {
                    console.log('✅ Description default generato correttamente');
                } else {
                    console.log('❌ Description default non corretto');
                }

                // Cleanup
                await VotingSession.findByIdAndDelete(session._id);
                console.log('🧹 Sessione defaults test rimossa');

            } catch (error) {
                console.log('❌ Errore test defaults:', error.message);
            }
        }

        // =====================
        // TEST 6: Deadline Handling
        // =====================
        console.log('\n📋 TEST 6: Deadline Handling');

        const matchForDeadline = await Match.findOne().populate('teamId');

        if (matchForDeadline && matchForDeadline.teamId) {
            try {
                const testDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // +1 giorno

                const result = await votingService.createVotingSession(
                    { id: '507f1f77bcf86cd799439016' },
                    {
                        targetId: matchForDeadline._id.toString(),
                        deadline: testDeadline.toISOString()
                    }
                );

                const { session } = result;

                if (session.deadline && Math.abs(session.deadline.getTime() - testDeadline.getTime()) < 1000) {
                    console.log('✅ Deadline custom impostato correttamente');
                } else {
                    console.log('❌ Deadline custom non corretto');
                }

                // Cleanup
                await VotingSession.findByIdAndDelete(session._id);
                console.log('🧹 Sessione deadline test rimossa');

            } catch (error) {
                console.log('❌ Errore test deadline:', error.message);
            }
        }

        console.log('\n🎉 === FINE TEST CREATE VOTING SESSION ===');
        console.log('📋 Il metodo createVotingSession è pronto per il controller refactoring!');

    } catch (error) {
        console.error('❌ ERRORE GENERALE TEST:', error);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Database disconnesso');
    }
}

// Esegui test
runCreateVotingSessionTests();