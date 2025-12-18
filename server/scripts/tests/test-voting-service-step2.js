/**
 * TEST RAPIDO - VotingService Step 2
 * Test per transformVoteData
 */

const VotingService = require('../../src/services/VotingService');

console.log('🧪 === TEST VOTING SERVICE - STEP 2 ===\n');

// Crea istanza del service
const votingService = new VotingService();

// =====================
// TEST transformVoteData
// =====================
console.log('🔄 TEST transformVoteData:');

// Test 1: Dati completi dal frontend (simula req.body.vote)
const frontendVoteData = {
    playerRatings: {
        "player123": {
            rating: 8.5,
            goals: 2,
            assists: 1,
            comments: "Ottima prestazione!",
            badges: ["mvp", "gol_piu_bello"]
        },
        "player456": {
            rating: 6.0,
            goals: 0,
            assists: 3,
            comments: "",
            badges: ["assist_man", "uomo_partita"]
        },
        "player789": {
            rating: 7.0,
            goals: 1,
            assists: 0,
            comments: "Buona partita",
            badges: []
        }
    },
    matchComments: "Partita fantastica, grande squadra!"
};

try {
    const transformed = votingService.transformVoteData(frontendVoteData);

    console.log('\n📥 DATI FRONTEND:');
    console.log('- Giocatori nel vote:', Object.keys(frontendVoteData.playerRatings).length);
    console.log('- Match comments:', frontendVoteData.matchComments);

    console.log('\n📤 DATI TRASFORMATI:');
    console.log('- PlayerRatings array length:', transformed.playerRatings.length);
    console.log('- Badges array length:', transformed.badges.length);
    console.log('- Overall comment:', transformed.overallComment);

    console.log('\n📊 DETTAGLIO PlayerRatings:');
    transformed.playerRatings.forEach((player, index) => {
        console.log(`  ${index + 1}. Player: ${player.playerId}, Rating: ${player.rating}, Goals: ${player.goals}, Assists: ${player.assists}`);
    });

    console.log('\n🏆 DETTAGLIO Badge Mappati:');
    transformed.badges.forEach((badge, index) => {
        console.log(`  ${index + 1}. Player: ${badge.playerId}, Badge: ${badge.badgeType}`);
    });

    // Verifica risultati
    const success =
        transformed.playerRatings.length === 3 &&
        transformed.badges.length === 4 && // mvp, gol_bello, assist_man, mvp (da uomo_partita)
        transformed.overallComment === frontendVoteData.matchComments &&
        transformed.playerRatings[0].playerId === "player123" &&
        transformed.playerRatings[0].rating === 8.5;

    console.log('\n✅ Test trasformazione completa:', success ? 'PASSED' : 'FAILED');

} catch (error) {
    console.log('❌ Test trasformazione completa FAILED:', error.message);
}

// Test 2: Dati con rating invalido (deve lanciare errore)
console.log('\n📊 TEST rating invalido:');
const invalidRatingData = {
    playerRatings: {
        "player123": {
            rating: 15, // INVALIDO!
            goals: 0,
            assists: 0,
            comments: "",
            badges: []
        }
    },
    matchComments: ""
};

try {
    votingService.transformVoteData(invalidRatingData);
    console.log('❌ Rating invalido: DOVEVA FALLIRE!');
} catch (error) {
    console.log('✅ Rating invalido correttamente rifiutato:', error.message);
}

// Test 3: Dati minimi (solo rating obbligatorio)
console.log('\n📊 TEST dati minimi:');
const minimalData = {
    playerRatings: {
        "player123": {
            rating: 6.5
            // No goals, assists, comments, badges
        }
    }
    // No matchComments
};

try {
    const transformed = votingService.transformVoteData(minimalData);

    const player = transformed.playerRatings[0];
    const success =
        player.rating === 6.5 &&
        player.goals === 0 && // Default
        player.assists === 0 && // Default
        player.comment === '' && // Default
        transformed.badges.length === 0 &&
        transformed.overallComment === ''; // Default

    console.log('✅ Test dati minimi:', success ? 'PASSED' : 'FAILED');
    console.log('  - Rating:', player.rating);
    console.log('  - Goals default:', player.goals);
    console.log('  - Assists default:', player.assists);

} catch (error) {
    console.log('❌ Test dati minimi FAILED:', error.message);
}

// Test 4: Input completamente invalido
console.log('\n📊 TEST input invalido:');
try {
    votingService.transformVoteData(null);
    console.log('❌ Input null: DOVEVA FALLIRE!');
} catch (error) {
    console.log('✅ Input null correttamente rifiutato:', error.message);
}

try {
    votingService.transformVoteData("not_an_object");
    console.log('❌ Input stringa: DOVEVA FALLIRE!');
} catch (error) {
    console.log('✅ Input stringa correttamente rifiutato:', error.message);
}

console.log('\n🎉 === FINE TEST STEP 2 ===');
console.log('📋 Il metodo transformVoteData è pronto per submitVote!');