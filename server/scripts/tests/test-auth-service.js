// Test Script per AuthService
require('dotenv').config();
const mongoose = require('mongoose');

// Import tutti i model necessari
require('../../src/models/User');
require('../../src/models/Team');
require('../../src/models/PlayerLeaderboardStats');
require('../../src/models/PlayerCardResult');
require('../../src/models/VotingSession');
require('../../src/models/Match');

const AuthService = require('../../src/services/AuthService');

async function testAuthService() {
    try {
        console.log('🧪 === TEST AUTH SERVICE ===\n');

        // Connetti al database
        await mongoose.connect(process.env.MONGODB_URI);

        // === TEST 1: VALIDATION ===
        console.log('📋 TEST 1: Input Validation');

        try {
            AuthService.validateRegistrationInput({});
            console.log('❌ FAIL: Doveva fallire la validazione');
        } catch (error) {
            console.log('✅ PASS: Validation error:', error.message);
        }

        try {
            AuthService.validateRegistrationInput({
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123'
            });
            console.log('✅ PASS: Validation corretta\n');
        } catch (error) {
            console.log('❌ FAIL: Validation doveva passare:', error.message);
        }

        // === TEST 2: PASSWORD HASHING ===
        console.log('📋 TEST 2: Password Hashing');

        const plainPassword = 'testpassword123';
        const hashedPassword = await AuthService.hashPassword(plainPassword);
        console.log('✅ Password hashata:', hashedPassword.substring(0, 20) + '...');

        const isValid = await AuthService.verifyPassword(plainPassword, hashedPassword);
        console.log('✅ Password verification:', isValid ? 'PASS' : 'FAIL');

        const isInvalid = await AuthService.verifyPassword('wrongpassword', hashedPassword);
        console.log('✅ Wrong password verification:', !isInvalid ? 'PASS' : 'FAIL');
        console.log('');

        // === TEST 3: JWT TOKEN ===
        console.log('📋 TEST 3: JWT Token Generation');

        const testUserId = '507f1f77bcf86cd799439011';
        const token = AuthService.generateToken(testUserId);
        console.log('✅ Token generato:', token.substring(0, 30) + '...');
        console.log('');

        // === TEST 4: USER EXISTS CHECK ===
        console.log('📋 TEST 4: User Exists Check');

        const existingUser = await AuthService.userExistsByEmail('davide@gmail.com'); // User che sappiamo esistere
        console.log('✅ User exists (davide@gmail.com):', existingUser);

        const nonExistingUser = await AuthService.userExistsByEmail('nonexistent@test.com');
        console.log('✅ User not exists (nonexistent@test.com):', !nonExistingUser);
        console.log('');

        // === TEST 5: REGISTRATION (USER TEMPORANEO) ===
        console.log('📋 TEST 5: User Registration');

        const testEmail = `test.auth.${Date.now()}@example.com`;

        try {
            const result = await AuthService.registerUser({
                name: 'Test Auth Service',
                email: testEmail,
                password: 'testpass123',
                birthdate: '1990-01-01'
            });

            console.log('✅ Registration SUCCESS:', {
                userId: result.user.id,
                email: result.user.email,
                hasToken: !!result.token
            });

            // === TEST 6: LOGIN ===
            console.log('\n📋 TEST 6: User Login');

            const loginResult = await AuthService.loginUser({
                email: testEmail,
                password: 'testpass123'
            });

            console.log('✅ Login SUCCESS:', {
                userId: loginResult.user.id,
                email: loginResult.user.email,
                hasToken: !!loginResult.token
            });

            // === TEST 7: GET USER PROFILE ===
            console.log('\n📋 TEST 7: Get User Profile');

            const profile = await AuthService.getUserProfile(result.user.id);

            console.log('✅ Profile SUCCESS:', {
                userId: profile.id,
                email: profile.email,
                hasPersonalStats: !!profile.personalStats,
                hasPlayerCard: !!profile.playerCard,
                teamsCount: profile.teams?.length || 0
            });

            // === CLEANUP: Remove test user ===
            console.log('\n🧹 CLEANUP: Removing test user');
            await mongoose.model('User').findByIdAndDelete(result.user.id);
            console.log('✅ Test user removed');

        } catch (error) {
            console.log('❌ REGISTRATION/LOGIN ERROR:', error.message);
        }

        console.log('\n🎉 === TUTTI I TEST COMPLETATI ===');

    } catch (error) {
        console.error('❌ ERRORE TEST:', error);
    } finally {
        await mongoose.disconnect();
        console.log('📦 Database disconnesso');

        // Solo exit se il file viene eseguito direttamente
        if (require.main === module) {
            process.exit(0);
        }
    }
}

// Esegui i test solo se il file viene eseguito direttamente
if (require.main === module) {
    testAuthService();
}

module.exports = { testAuthService };