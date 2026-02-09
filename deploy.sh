#!/bin/bash

# Configuration
SERVER_IP="18.118.93.50"
SSH_KEY="~/.ssh/zaps_deploy_key"
REMOTE_USER="ubuntu"
REMOTE_DIR="~/zaps-prod"

echo "🚀 Starting Deployment to $SERVER_IP..."

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
    .

# 3. Upload to server
echo "Pc Uploading to server..."
scp -i $SSH_KEY deploy.tar.gz $REMOTE_USER@$SERVER_IP:$REMOTE_DIR/

# 4. Remote execution (Extract & Rebuild)
echo "🛠️  Building and restarting on server..."
ssh -i $SSH_KEY $REMOTE_USER@$SERVER_IP << EOF
    cd $REMOTE_DIR
    
    # Backup current .env files just in case
    cp .env .env.bak
    cp backend/.env backend/.env.bak
    cp frontend/.env frontend/.env.bak

    # Extract new code (overwriting old)
    tar -xzf deploy.tar.gz

    # Restore .env files (so we don't overwrite prod secrets with local dev envs if they were included)
    # NOTE: We carefully rely on the server's .env being the source of truth.
    # If deploy.tar.gz contains .env, it would overwrite. 
    # Let's ensure we don't accidentally nuke prod secrets.
    # actually, usually we EXCLUDE .env from the tar, but if you have a local .env it might get in.
    # Safest is to explicitly restore from backup or exclude .env in tar.
    # I added --exclude '.env' to tar command below in my mind, let me add it to the script above to be safe.
    
    # Rebuild Single Services or All
    # We'll rebuild both to be safe, valid for code changes in either.
    docker compose -f docker-compose.prod.yml up -d --build

    # Cleanup
    rm deploy.tar.gz
    
    # Prune old images to save space
    docker image prune -f
EOF

# Cleanup local
rm deploy.tar.gz

echo "✅ Deployment Complete!"
