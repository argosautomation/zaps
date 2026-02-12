#!/bin/bash
# ============================================================
# Staging Deploy Script — deploys to dev.zaps.ai (Lightsail)
# ============================================================
set -e

SERVER_IP="18.118.93.50"
SSH_KEY="~/.ssh/zaps_deploy_key"
REMOTE_USER="ubuntu"
REMOTE_DIR="~/zaps-staging"

echo "🧪 Starting STAGING deployment to dev.zaps.ai ($SERVER_IP)..."

# 1. Clean previous artifacts
rm -f deploy.tar.gz

# 2. Create archive (excluding heavy/unnecessary folders)
echo "📦 Packaging source code..."
tar -czf deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='.DS_Store' \
    --exclude='coverage' \
    --exclude='deploy.tar.gz' \
    --exclude='backend/migrate' \
    --exclude='backend/gateway' \
    --exclude='backend/keymgr' \
    --exclude='backend/tmp' \
    --exclude='backend/zaps-gateway' \
    --exclude='.env' \
    --exclude='backend/.env' \
    --exclude='frontend/.env' \
    --exclude='.gemini' \
    --exclude='copilot' \
    .

# 3. Upload to server
echo "📤 Uploading to server..."
scp -i $SSH_KEY deploy.tar.gz $REMOTE_USER@$SERVER_IP:$REMOTE_DIR/

# 4. Remote execution (Extract & Rebuild)
echo "🛠️  Building and restarting on server..."
ssh -i $SSH_KEY $REMOTE_USER@$SERVER_IP << 'EOF'
    cd ~/zaps-staging

    # Backup .env files
    [ -f .env ] && cp .env .env.bak
    [ -f backend/.env ] && cp backend/.env backend/.env.bak

    # Extract new code
    tar -xzf deploy.tar.gz

    # Restore .env from backup (code deploy should never overwrite secrets)
    [ -f .env.bak ] && mv .env.bak .env
    [ -f backend/.env.bak ] && mv backend/.env.bak backend/.env

    # Rebuild and restart
    docker compose -f docker-compose.prod.yml up -d --build

    # Cleanup
    rm -f deploy.tar.gz
    docker image prune -f

    echo "✅ Staging containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
EOF

# Cleanup local
rm -f deploy.tar.gz

echo ""
echo "✅ Staging deployment complete!"
echo "🌐 https://dev.zaps.ai"
