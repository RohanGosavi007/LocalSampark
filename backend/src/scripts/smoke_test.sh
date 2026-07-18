#!/bin/bash
# LocalSampark Staging Environments API Validation Smoke Test

API_URL=${API_URL:-"http://localhost:5000"}
echo "Executing smoke verification checks against $API_URL..."

# 1. Validate health route
echo -n "Checking GET /health: "
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
if [ "$HEALTH_RESPONSE" -eq 200 ]; then
  echo "PASSED [200]"
else
  echo "FAILED [$HEALTH_RESPONSE]"
fi

# 2. Validate Prometheus metrics route
echo -n "Checking GET /metrics: "
METRICS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/metrics")
if [ "$METRICS_RESPONSE" -eq 200 ]; then
  echo "PASSED [200]"
else
  echo "FAILED [$METRICS_RESPONSE]"
fi

echo "Smoke test execution finished."
