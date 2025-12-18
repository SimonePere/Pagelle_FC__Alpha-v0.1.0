/**
 * TEST RAPIDO - VotingService Step 1
 * Test per validateVoteRating e validateBadgeMapping
 */

const VotingService = require('../../src/services/VotingService');

console.log('🧪 === TEST VOTING SERVICE - STEP 1 ===\n');

// Crea istanza del service
const votingService = new VotingService();

// =====================
// TEST validateVoteRating
// =====================
console.log('📊 TEST validateVoteRating:');

try {
    // Test 1: Rating valido
    votingService.validateVoteRating(7.5);
    console.log('✅ Rating 7.5: VALIDO');

    votingService.validateVoteRating(1);
    console.log('✅ Rating 1: VALIDO');

    votingService.validateVoteRating(10);
    console.log('✅ Rating 10: VALIDO');

} catch (error) {
    console.log('❌ Rating validi falliti:', error.message);
}

try {
    // Test 2: Rating non validi (devono lanciare errore)
    votingService.validateVoteRating(0.5);
    console.log('❌ Rating 0.5: DOVEVA FALLIRE!');
} catch (error) {
    console.log('✅ Rating 0.5: CORRETTAMENTE RIFIUTATO -', error.message);
}

try {
    votingService.validateVoteRating(11);
    console.log('❌ Rating 11: DOVEVA FALLIRE!');
} catch (error) {
    console.log('✅ Rating 11: CORRETTAMENTE RIFIUTATO -', error.message);
}

try {
    votingService.validateVoteRating('invalid');
    console.log('❌ Rating stringa: DOVEVA FALLIRE!');
} catch (error) {
    console.log('✅ Rating stringa: CORRETTAMENTE RIFIUTATO -', error.message);
}

// =====================
// TEST validateBadgeMapping
// =====================
console.log('\n🏆 TEST validateBadgeMapping:');

// Test 1: Badge validi
const validBadges = ['gol_piu_bello', 'mvp', 'assist_man', 'uomo_partita'];
const mappedBadges = votingService.validateBadgeMapping(validBadges);
console.log('📥 Input badge:', validBadges);
console.log('📤 Output mappato:', mappedBadges);
console.log('✅ Mapping badge validi:', mappedBadges.length > 0 ? 'OK' : 'FAILED');

// Test 2: Badge con invalidi mescolati
const mixedBadges = ['mvp', 'badge_inesistente', 'gol_piu_bello', 'altro_invalido'];
const filteredBadges = votingService.validateBadgeMapping(mixedBadges);
console.log('\n📥 Input badge misti:', mixedBadges);
console.log('📤 Output filtrato:', filteredBadges);
console.log('✅ Filtro badge invalidi:', filteredBadges.length === 2 ? 'OK' : 'FAILED');

// Test 3: Input non array
const emptyResult = votingService.validateBadgeMapping('not_an_array');
console.log('\n📥 Input non-array:', 'not_an_array');
console.log('📤 Output:', emptyResult);
console.log('✅ Input non-array gestito:', Array.isArray(emptyResult) && emptyResult.length === 0 ? 'OK' : 'FAILED');

console.log('\n🎉 === FINE TEST STEP 1 ===');
console.log('📋 I due metodi base sono pronti per essere usati in submitVote!');