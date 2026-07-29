import http from 'k6/http';
import { check, sleep } from 'k6';

// 10x Scale Load Test (1,000 requests/sec per pincode)
export const options = {
  stages: [
    { duration: '10s', target: 200 },  // Ramp up to 200 users
    { duration: '30s', target: 1000 }, // Spike to 1,000 users (simulate rush hour)
    { duration: '10s', target: 0 },    // Ramp down
  ],
};

const BASE_URL = 'http://localhost:5000/api/v1';

export default function () {
  // Simulate fetching shops for a specific pincode territory
  const lat = 19.0760;
  const lng = 72.8777;
  const radius = 5;

  const res = http.get(\`\${BASE_URL}/shops/nearby?lat=\${lat}&lng=\${lng}&radius=\${radius}\`);

  // Verify caching and performance
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 30ms': (r) => r.timings.duration < 30, // Strict API timeout threshold
    'is cached via ETag': (r) => r.headers['Etag'] !== undefined,
  });

  sleep(1);
}
