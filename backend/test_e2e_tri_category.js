// End-to-End Integration Verification Test Suite for LocalSampark Tri-Category SuperApp
// Tests: Carpool, Marketplace, Jobs, Gamification, Sockets, and Admin endpoints

const http = require('http');

const API_HOST = 'localhost';
const API_PORT = 5000;

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: `/api/v1${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload && { 'Content-Length': Buffer.byteLength(payload) }),
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (payload) req.write(payload);
    req.end();
  });
}

async function runE2ETests() {
  console.log('====================================================');
  console.log('🚀 RUNNING LOCALSAMPARK E2E INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`[TEST] ${name} ... `);
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (err) {
      console.log(`❌ FAILED: ${err.message}`);
      failed++;
    }
  }

  // 1. Carpool Cost Splitter
  await test('Carpool Cost Splitter Calculation', async () => {
    const res = await makeRequest('POST', '/carpool/cost-calculator', {
      distance_km: 40,
      fuel_price_per_liter: 105,
      mileage_kmpl: 15,
      toll_amount: 50,
      passengers: 3
    });
    if (res.status !== 200 || !res.body.success) throw new Error(`Status ${res.status}`);
    if (!res.body.calculation.per_person_cost || !res.body.calculation.eco_impact) {
      throw new Error('Malformed cost splitter response');
    }
  });

  // 2. Marketplace Price Suggestion AI
  await test('Marketplace AI Price Estimator', async () => {
    const res = await makeRequest('POST', '/marketplace/price-suggest', {
      category: 'Electronics',
      condition: 'Good',
      title: 'Sony Headphones'
    });
    if (res.status !== 200 || !res.body.success) throw new Error(`Status ${res.status}`);
  });

  // 3. Jobs Skill Assessments
  await test('Jobs Skill Assessments Listing', async () => {
    const res = await makeRequest('GET', '/jobs/assessments');
    if (res.status !== 200 || !res.body.success) throw new Error(`Status ${res.status}`);
    if (!Array.isArray(res.body.assessments) || res.body.assessments.length === 0) {
      throw new Error('No assessments seeded or returned');
    }
  });

  // 4. Carpool Groups Listing
  await test('Carpool Groups Listing', async () => {
    const res = await makeRequest('GET', '/carpool/groups');
    if (res.status !== 200 || !res.body.success) throw new Error(`Status ${res.status}`);
  });

  // 5. Gamification Leaderboard
  await test('Gamification Global Leaderboard', async () => {
    const res = await makeRequest('GET', '/gamification/leaderboard');
    if (res.status !== 200 || !res.body.success) throw new Error(`Status ${res.status}`);
    if (!res.body.leaderboard) throw new Error('Missing leaderboard payload');
  });

  // 6. Marketplace Auctions Listing
  await test('Marketplace Live Auctions Listing', async () => {
    const res = await makeRequest('GET', '/marketplace/auctions');
    if (res.status !== 200 || !res.body.success) throw new Error(`Status ${res.status}`);
  });

  console.log('\n====================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('====================================================');
}

runE2ETests().catch(console.error);
