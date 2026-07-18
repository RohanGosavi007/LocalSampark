#!/bin/bash
# LocalSampark Staging & Production Deployment Automation Script

echo "Checking deployment prerequisites..."

# 1. Verify Docker command availability
if ! [ -x "$(command -v docker)" ]; then
  echo "Error: docker is not installed. Exiting." >&2
  exit 1
fi

# 2. Verify Docker Compose command availability
if ! [ -x "$(command -v docker-compose)" ]; then
  echo "Error: docker-compose is not installed. Exiting." >&2
  exit 1
fi

echo "Prerequisites verified. Starting deployment update..."

# 3. Pull newest changes (if git tracking) and rebuild containers
# git pull origin main
docker-compose down
docker-compose up -d --build

# 4. Run migration utility inside container
echo "Running database schema migrations..."
docker-compose exec -T api npm run migrate

echo "Deployment successfully executed!"
