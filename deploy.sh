#!/bin/bash
# deploy.sh
# Standard deployment script for Practice Hub Production
# Run this on the server after pushing images from your local machine

set -e

# Load IMAGE_TAG from .env.prod if not set
if [ -z "$IMAGE_TAG" ]; then
  IMAGE_TAG=$(grep '^IMAGE_TAG=' .env.prod | cut -d '=' -f2)
  export IMAGE_TAG
fi

echo "============================================"
echo "  Deploying Practice Hub — tag: $IMAGE_TAG"
echo "============================================"

echo ""
echo "[1/3] Pulling latest images from Docker Hub..."
docker compose -f docker-compose.prod.yml --env-file .env.prod pull

echo ""
echo "[2/3] Stopping existing containers..."
docker compose -f docker-compose.prod.yml --env-file .env.prod down

echo ""
echo "[3/3] Starting new containers..."
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

echo ""
echo "============================================"
echo "  Deployment complete!"
echo "============================================"
echo ""
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
