// test-api-response.js
// Script per testare la risposta dell'API PlayerCard results

require('dotenv').config();
const mongoose = require('mongoose');

const testAPIResponse = async () => {
    try {
        console.log('🧪 TESTING API RESPONSE FORMAT\n');

        await mongoose.connect(process.env.MONGODB_URI);

        const PlayerCardResult = require('../src/models/PlayerCardResult');

        // Simula quello che fa l'API - trova risultati per Six
        const playerCardResults = await PlayerCardResult.find({
            targetPlayerId: '693550234608b6bba35e9bc9' // Six ID
        }).sort({ createdAt: -1 }).lean();

        console.log('📊 Raw Database Result:');
        console.log('======================');
        console.log(JSON.stringify(playerCardResults[0], null, 2));

        // Simula il formato dell'API response
        if (playerCardResults.length > 0) {
            const result = playerCardResults[0];
            const formattedResult = {
                id: result._id,
                finalAttributes: result.finalAttributes,
                finalAdditionalAttributes: result.finalAdditionalAttributes, // ⭐ QUESTO È IL CAMPO CHIAVE
                finalOverallRating: result.finalOverallRating,
                grade: result.grade,
            };

            console.log('\n🎯 API Response Format (simulated):');
            console.log('===================================');
            console.log(JSON.stringify(formattedResult, null, 2));
        }

        mongoose.disconnect();
        console.log('\n✅ Test completed');

    } catch (error) {
        console.error('❌ Error:', error);
        mongoose.disconnect();
    }
};

testAPIResponse();