// Test Script per TeamService (da creare)
require('dotenv').config();
const mongoose = require('mongoose');

// Import tutti i model necessari
require('../../src/models/User');
require('../../src/models/Team');
require('../../src/models/PlayerLeaderboardStats');

// TeamService sarà creato durante il refactoring
const TeamService = require('../../src/services/TeamService');

async function testTeamService() {
    try {
        console.log('🧪 === TEST TEAM SERVICE ===\n');

        // Connetti al database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Database connesso\n');

        // === TEST 1: VALIDATION ===
        console.log('📋 TEST 1: Team Input Validation');

        try {
            TeamService.validateTeamInput({});
            console.log('❌ FAIL: Doveva fallire la validazione team');
        } catch (error) {
            console.log('✅ PASS: Team validation error:', error.message);
        }

        try {
            TeamService.validateTeamInput({
                name: 'Test Team Service',
                description: 'Team per unit test'
            });
            console.log('✅ PASS: Team validation corretta\n');
        } catch (error) {
            console.log('❌ FAIL: Team validation doveva passare:', error.message);
        }

        // === TEST 2: TEAM CREATION ===
        console.log('📋 TEST 2: Team Creation');

        try {
            const teamData = {
                name: `Test Team ${Date.now()}`,
                description: 'Team creato per test automatici',
                createdBy: '507f1f77bcf86cd799439011',
                settings: {
                    isPrivate: false,
                    allowInvites: true
                }
            };

            const team = await TeamService.createTeam(teamData);
            console.log('✅ Team creato:', {
                id: team.id,
                name: team.name,
                inviteCode: team.inviteCode,
                creatorIsAdmin: team.adminIds.includes(teamData.createdBy),
                creatorIsMember: team.memberIds.includes(teamData.createdBy)
            });

            // === TEST 3: INVITE CODE GENERATION ===
            console.log('\n📋 TEST 3: Invite Code Generation');

            const newInviteCode = await TeamService.generateNewInviteCode(team.id);
            console.log('✅ Nuovo invite code generato:', {
                teamId: team.id,
                newCode: newInviteCode,
                isUnique: newInviteCode !== team.inviteCode
            });

            // === TEST 4: TEAM JOIN BY INVITE CODE ===
            console.log('\n📋 TEST 4: Join Team by Invite Code');

            const newMemberId = '507f1f77bcf86cd799439012';
            const joinResult = await TeamService.joinTeamByInviteCode(newInviteCode, newMemberId);
            console.log('✅ User joined team:', {
                teamId: joinResult.team.id,
                newMemberId: newMemberId,
                totalMembers: joinResult.team.memberIds.length
            });

            // === TEST 5: TEAM MEMBER MANAGEMENT ===
            console.log('\n📋 TEST 5: Team Member Management');

            // Promote to admin
            const promotedMember = await TeamService.promoteToAdmin(team.id, newMemberId);
            console.log('✅ Member promoted to admin:', {
                teamId: team.id,
                memberId: newMemberId,
                isAdmin: promotedMember.adminIds.includes(newMemberId)
            });

            // Remove member
            const updatedTeam = await TeamService.removeMember(team.id, newMemberId);
            console.log('✅ Member removed:', {
                teamId: team.id,
                totalMembers: updatedTeam.memberIds.length,
                memberRemoved: !updatedTeam.memberIds.includes(newMemberId)
            });

            // === TEST 6: TEAM STATS CALCULATION ===
            console.log('\n📋 TEST 6: Team Stats Calculation');

            const teamStats = await TeamService.calculateTeamStats(team.id);
            console.log('✅ Team stats calculated:', {
                totalMembers: teamStats.totalMembers,
                totalMatches: teamStats.totalMatches,
                totalGoals: teamStats.totalGoals,
                averageRating: teamStats.averageRating
            });

            // === TEST 7: GET USER TEAMS ===
            console.log('\n📋 TEST 7: Get User Teams');

            const userTeams = await TeamService.getUserTeams(teamData.createdBy);
            console.log('✅ User teams retrieved:', {
                totalTeams: userTeams.length,
                hasTeams: userTeams.length > 0
            });

            // === CLEANUP ===
            console.log('\n🧹 CLEANUP: Removing test data');
            await mongoose.model('Team').findByIdAndDelete(team.id);

            // Remove team reference from user
            await mongoose.model('User').updateOne(
                { _id: teamData.createdBy },
                { $pull: { teamIds: team.id } }
            );

            console.log('✅ Test data removed');

        } catch (error) {
            console.log('❌ TEAM SERVICE ERROR:', error.message);
        }

        console.log('\n🎉 === TUTTI I TEST TEAM COMPLETATI ===');

    } catch (error) {
        console.error('❌ ERRORE TEST:', error);
    } finally {
        await mongoose.disconnect();
        console.log('📦 Database disconnesso');
        process.exit(0);
    }
}

// Esegui i test solo se il file viene eseguito direttamente
if (require.main === module) {
    testTeamService();
}

module.exports = { testTeamService };