#!/usr/bin/env node
/**
 * 🧪 Backend Health Check Script
 * Verifica che il backend sia pronto per i test
 */

const API_BASE = 'http://localhost:5000';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = (color, message) => console.log(`${colors[color]}${message}${colors.reset}`);

const testEndpoint = async (endpoint, method = 'GET', body = null, headers = {}) => {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.text();
    
    return {
      status: response.status,
      ok: response.ok,
      data: data || null
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message
    };
  }
};

const runHealthCheck = async () => {
  log('blue', '\n🧪 PAGELLE FC - BACKEND HEALTH CHECK');
  log('blue', '=====================================\n');

  const tests = [
    {
      name: 'Server Health',
      endpoint: '/health',
      expectedStatus: 200
    },
    {
      name: 'API Base Route',
      endpoint: '/api/v1',
      expectedStatus: 200
    },
    {
      name: 'Auth Register Endpoint',
      endpoint: '/api/v1/auth/register',
      method: 'POST',
      body: { test: true },
      expectedStatus: [400, 422] // Dovrebbe respingere dati invalidi
    },
    {
      name: 'Teams Endpoint (No Auth)',
      endpoint: '/api/v1/teams',
      expectedStatus: [401, 403] // Dovrebbe richiedere auth
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    process.stdout.write(`${test.name.padEnd(30)} ... `);
    
    const result = await testEndpoint(
      test.endpoint, 
      test.method, 
      test.body
    );

    const expectedStatuses = Array.isArray(test.expectedStatus) 
      ? test.expectedStatus 
      : [test.expectedStatus];

    if (result.status === 0) {
      log('red', `❌ CONNECTION FAILED (${result.error})`);
      failed++;
    } else if (expectedStatuses.includes(result.status)) {
      log('green', `✅ OK (${result.status})`);
      passed++;
    } else {
      log('red', `❌ UNEXPECTED (${result.status})`);
      failed++;
    }
  }

  log('blue', '\n=====================================');
  log('green', `✅ PASSED: ${passed}`);
  log('red', `❌ FAILED: ${failed}`);
  
  if (failed === 0) {
    log('green', '\n🎉 BACKEND READY FOR TESTING!');
    log('yellow', '\n💡 Next steps:');
    log('yellow', '   1. Start frontend: npm run dev');
    log('yellow', '   2. Open: http://localhost:5173');
    log('yellow', '   3. Follow TEST_SCENARIOS.md');
  } else {
    log('red', '\n🚨 BACKEND NOT READY');
    log('yellow', '\n💡 Fix these issues first:');
    log('yellow', '   1. Make sure backend is running: npm run dev');
    log('yellow', '   2. Check MongoDB connection');
    log('yellow', '   3. Verify CORS settings');
  }
  
  log('reset', '');
  process.exit(failed === 0 ? 0 : 1);
};

// Verifica se fetch è disponibile (Node.js 18+)
if (typeof fetch === 'undefined') {
  log('red', '❌ Questo script richiede Node.js 18+ (per fetch)');
  log('yellow', '💡 Aggiorna Node.js o usa: node --experimental-fetch check-backend.js');
  process.exit(1);
}

runHealthCheck().catch(error => {
  log('red', `\n🚨 ERRORE FATALE: ${error.message}`);
  process.exit(1);
});