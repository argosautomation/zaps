#!/bin/bash
# ============================================================
# Production Deploy Script — deploys to zaps.ai (AWS Copilot/ECS)
# ============================================================
set -e

echo "🚀 Starting PRODUCTION deployment to zaps.ai..."
echo ""

# Deploy backend first (includes database migrations)
echo "📦 Deploying backend..."
copilot svc deploy --name backend --env production --force

echo ""
echo "✅ Backend deployed."
echo ""

# Deploy frontend
echo "📦 Deploying frontend..."
copilot svc deploy --name frontend --env production --force

echo ""
echo "✅ Production deployment complete!"
echo "🌐 https://zaps.ai"
