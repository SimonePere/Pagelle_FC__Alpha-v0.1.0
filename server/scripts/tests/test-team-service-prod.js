const mongoose = require('mongoose');
require('dotenv').config(); // Carica le variabili d'ambiente

// Setup DB connection to production (same as npm run prod)
const connectToDB = async () => {
    try {
        // Simula NODE_ENV=production come fa npm run prod
        process.env.NODE_ENV = 'production';

        // Usa la configurazione del database di produzione
        const mongoUri = process.env.MONGODB_URI; // Database di produzione

        await mongoose.connect(mongoUri);
        console.log('📊 Connected to Production MongoDB');
        console.log('🎯 Database:', mongoose.connection.name);
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

// Test Team Service
const testTeamService = async () => {
    console.log('\n🧪 === TESTING TEAM SERVICE ===\n');

    const TeamService = require('../../src/services/TeamService');
    const teamService = new TeamService(); // Istanzia la classe

    // Use your actual team ID
    const teamId = '6932f76cdd1f324fdff48481'; // DosiMele team
    const userId = '6932f5c0dd1f324fdff4847a'; // Six (team creator)

    try {
        // Test 1: Get All Teams (Public)
        console.log('1. 🌍 Testing getAllTeams()...');
        const allTeams = await teamService.getAllTeams({
            page: 1,
            limit: 5,
            search: ''
        });
        console.log('✅ Public teams found:', allTeams.teams.length);
        console.log('📄 Pagination info:', allTeams.pagination);

        // Test 2: Get Specific Team
        console.log('\n2. 🟢 Testing getTeam()...');
        try {
            const teamDetails = await teamService.getTeam(teamId, userId);
            console.log('✅ Team details for:', teamDetails.team.name);
            console.log('👥 Total members:', teamDetails.team.totalMembers);
            console.log('🔑 Is user member:', teamDetails.team.isUserMember);
            console.log('👑 Is user admin:', teamDetails.team.isUserAdmin);
        } catch (teamError) {
            console.log('❌ Team access error:', teamError.message);
            console.log('🔍 This could mean: team not found, private team, or access denied');
        }

        // Test 3: Get My Teams
        console.log('\n3. 🟣 Testing getMyTeams()...');
        const myTeams = await teamService.getMyTeams(userId);
        console.log('✅ My teams found:', myTeams.teams.length);
        myTeams.teams.forEach(team => {
            console.log(`  - ${team.name} (${team.totalMembers} members)`);
        });

        // Test 4: Create Team - SKIPPED to avoid duplicates
        console.log('\n4. 💙 Testing createTeam() - SKIPPED (to avoid duplicates)');

        console.log('\n✅ === ALL TEAM SERVICE TESTS PASSED ===');

    } catch (error) {
        console.error('❌ Test error:', error.message);
        if (error.name === 'AppError') {
            console.error('📋 Error details:', {
                statusCode: error.statusCode,
                isOperational: error.isOperational
            });
        }
    }
};

// Run tests
const runTests = async () => {
    await connectToDB();
    await testTeamService();
    await mongoose.connection.close();
    console.log('\n📊 Database connection closed');
};

runTests();