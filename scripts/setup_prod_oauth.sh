#!/bin/bash

# Configuration matching deploy.sh
SERVER_IP="18.118.93.50"
SSH_KEY="~/.ssh/zaps_deploy_key"
REMOTE_USER="ubuntu"
REMOTE_DIR="~/zaps-prod"

echo "🔐 Setup GitHub OAuth for Production"
echo "------------------------------------"
echo "You need a GitHub OAuth App configured with:"
echo "  - Homepage URL: https://zaps.ai"
echo "  - Callback URL: https://zaps.ai/auth/github/callback"
echo ""

# Prompt for credentials
read -p "Enter GitHub Client ID: " CLIENT_ID
read -s -p "Enter GitHub Client Secret: " CLIENT_SECRET
echo ""
echo "------------------------------------"

if [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ]; then
    echo "❌ Error: Client ID and Secret are required."
    exit 1
fi

echo "🚀 Configuring server..."

ssh -i $SSH_KEY $REMOTE_USER@$SERVER_IP << EOF
    cd $REMOTE_DIR/backend
    
    # Check if .env exists
    if [ ! -f .env ]; then
        echo "⚠️  .env not found, creating one..."
        touch .env
    fi

    # Remove existing keys to avoid duplicates
    sed -i '/GITHUB_CLIENT_ID/d' .env
    sed -i '/GITHUB_CLIENT_SECRET/d' .env
    sed -i '/GITHUB_REDIRECT_URL/d' .env

    # Append new keys
    echo "" >> .env
    echo "# GitHub OAuth (Added via setup script)" >> .env
    echo "GITHUB_CLIENT_ID=$CLIENT_ID" >> .env
    echo "GITHUB_CLIENT_SECRET=$CLIENT_SECRET" >> .env
    echo "GITHUB_REDIRECT_URL=https://zaps.ai/auth/github/callback" >> .env

    echo "✅ .env updated."

    # Restart backend to apply changes
    echo "🔄 Restarting backend service..."
    cd ..
    docker compose -f docker-compose.prod.yml up -d --force-recreate backend

    echo "✅ Backend restarted."
EOF

echo "✨ Done! GitHub login should work now."
