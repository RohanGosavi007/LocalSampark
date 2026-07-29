import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 configuration
export const options = {
  stages: [
    { duration: '30s', target: 500 }, // Ramp-up to 500 users over 30s
    { duration: '1m', target: 500 },  // Sustain 500 users for 1 minute
    { duration: '30s', target: 0 },   // Ramp-down to 0 users over 30s
  ],
  thresholds: {
    // 95% of requests must complete under 200ms
    http_req_duration: ['p(95)<200'],
    // Error rate must be less than 1%
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5000/api/ecommerce';

export default function () {
  // Scenario 1: Redis Caching Benchmark
  // Hits the categories endpoint which is heavily cached via Redis
  const categoryRes = http.get(`${BASE_URL}/shops/categories`);
  
  check(categoryRes, {
    'categories status is 200': (r) => r.status === 200,
    'categories returned fast (cache hit)': (r) => r.timings.duration < 50,
  });

  // Short pause to simulate user reading
  sleep(0.5);

  // Scenario 2: PgBouncer Database Benchmark
  // Hits the shops endpoint fetching paginated SQL data
  const shopsRes = http.get(`${BASE_URL}/shops?limit=20`);
  
  check(shopsRes, {
    'shops list status is 200': (r) => r.status === 200,
    'shops list query successful': (r) => r.json().length >= 0,
  });

  // Wait 1 second before looping
  sleep(1);
}
