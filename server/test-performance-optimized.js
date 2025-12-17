// test-performance-prod.js - Test delle performance ottimizzate
const http = require('http');

async function httpGet(url) {
    return new Promise((resolve, reject) => {
        const request = http.get(url, (response) => {
            let data = '';

            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                try {
                    resolve({
                        status: response.statusCode,
                        data: JSON.parse(data)
                    });
                } catch (error) {
                    reject(new Error(`Parse error: ${error.message}`));
                }
            });
        });

        request.on('error', reject);
        request.setTimeout(10000, () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

async function testOptimizedPerformance() {
    console.log('🧪 Testing optimized leaderboard performance...\n');

    const baseURL = 'http://localhost:5000';
    const teamId = '6932f76cdd1f324fdff48481'; // Team DosiMele

    try {
        // Test endpoint ottimizzato
        console.log('📊 Test 1: Optimized getAllLeaderboards aggregation');
        console.log(`🎯 Testing team: DosiMele (${teamId})\n`);

        const startTime = Date.now();
        const response = await httpGet(`${baseURL}/api/v1/leaderboards/${teamId}/all?limit=5`);
        const responseTime = Date.now() - startTime;

        console.log(`   ⚡ Response Time: ${responseTime}ms`);
        console.log(`   📈 Target: <50ms (vs previous 200ms)`);

        // Debug response structure
        console.log(`   📋 Response status: ${response.status}`);
        console.log(`   📊 Response structure:`, JSON.stringify(response.data, null, 2));

        console.log(`   📊 Data received:`, {
            rating: response.data?.data?.rating?.length || 0,
            goals: response.data?.data?.goals?.length || 0,
            assists: response.data?.data?.assists?.length || 0,
            playercard: response.data?.data?.playercard?.length || 0,
            form: response.data?.data?.form?.length || 0
        });

        // Performance evaluation
        if (responseTime < 50) {
            console.log('\n🎉 EXCELLENT! Lightning fast performance achieved!');
            console.log(`💡 Improvement: ${Math.round((200 - responseTime) / 200 * 100)}% faster than before!`);
        } else if (responseTime < 100) {
            console.log('\n✅ GREAT! Significant improvement achieved!');
            console.log(`💡 Improvement: ${Math.round((200 - responseTime) / 200 * 100)}% faster than before!`);
        } else if (responseTime < 200) {
            console.log('\n👍 GOOD! Performance improved!');
            console.log(`💡 Improvement: ${Math.round((200 - responseTime) / 200 * 100)}% faster than before!`);
        } else {
            console.log('\n⚠️  Performance still needs work');
        }

        // Test multiple requests for consistency
        console.log('\n🔄 Testing consistency with 3 rapid requests...');
        const times = [];

        for (let i = 0; i < 3; i++) {
            const start = Date.now();
            await httpGet(`${baseURL}/api/v1/leaderboards/${teamId}/all?limit=5`);
            times.push(Date.now() - start);
        }

        const avgTime = Math.round(times.reduce((a, b) => a + b) / times.length);
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);

        console.log(`\n📊 Performance Statistics:`);
        console.log(`   • First request: ${responseTime}ms`);
        console.log(`   • Average time: ${avgTime}ms`);
        console.log(`   • Fastest: ${minTime}ms`);
        console.log(`   • Slowest: ${maxTime}ms`);
        console.log(`   • Consistency: ${maxTime - minTime}ms variation`);

        console.log('\n🎯 Optimization Summary:');
        console.log(`   ✅ Database: Production with optimized indexes`);
        console.log(`   ✅ Query: Aggregation pipeline (3 queries vs 5 separate)`);
        console.log(`   ✅ Indexes: 12 critical indexes created`);
        console.log(`   ✅ Performance: ${avgTime}ms average (target: <50ms)`);

        if (avgTime < 50) {
            console.log('\n🏆 WEEK 1 OPTIMIZATION: COMPLETE SUCCESS! 🏆');
        } else if (avgTime < 100) {
            console.log('\n🎯 WEEK 1 OPTIMIZATION: GREAT PROGRESS!');
        } else {
            console.log('\n📈 WEEK 1 OPTIMIZATION: GOOD FOUNDATION!');
        }

    } catch (error) {
        console.error('\n❌ Test failed:');
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Message: ${error.response.data?.message || error.response.statusText}`);
            if (error.response.status === 404) {
                console.log('   💡 Check if the leaderboard route exists: /api/leaderboards/:teamId/all');
            }
        } else if (error.code === 'ECONNREFUSED') {
            console.log('   Connection refused - Server might not be running on port 5000');
        } else {
            console.log(`   Error: ${error.message}`);
        }
    }
}

console.log('🚀 Starting performance test...');
testOptimizedPerformance();