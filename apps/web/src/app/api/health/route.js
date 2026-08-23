// Lightweight readiness probe for Render's zero-downtime deploy health check
// (render.yaml -> localsampark-web -> healthCheckPath). Must stay dependency-free
// so it can respond before any data fetching or heavy client bundles are relevant.
export async function GET() {
  return Response.json({ status: 'ok', service: 'localsampark-web' });
}
