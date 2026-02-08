# Deploying Zaps.ai to Production

The deployment process is currently **SSH-based** (Push-to-Deploy).
We do not use GitHub Actions or CI/CD pipelines at this stage.

## How to Deploy Updates

1. **Commit your changes locally** (optional but recommended).
2. **Run the deployment script** from your project root:

   ```bash
   ./deploy.sh
   ```

## What the script does:
1. **Packages** your local source code into a tarball (`deploy.tar.gz`).
   - Recursively excludes `node_modules`, `.next`, `.git`, and local `.env` files.
2. **Uploads** the package to the server (`18.118.93.50`) via SCP.
3. **Connects** via SSH to:
   - Extract the code.
   - Rebuild the Docker containers (`docker compose up -d --build`).
   - Restart the services.
   - Prune old Docker images to save space.

## Manual Commands (if script fails)

If you need to deploy manually:

```bash
# 1. Zip
tar -czf deploy.tar.gz --exclude='node_modules' --exclude='.next' --exclude='.git' .

# 2. Upload
scp -i ~/.ssh/zaps_deploy_key deploy.tar.gz ubuntu@18.118.93.50:~/zaps-prod/

# 3. Deploy
ssh -i ~/.ssh/zaps_deploy_key ubuntu@18.118.93.50 << 'EOF'
  cd ~/zaps-prod
  tar -xzf deploy.tar.gz
  docker compose -f docker-compose.prod.yml up -d --build frontend backend
EOF
```

## Server Access
- **IP**: `18.118.93.50`
- **User**: `ubuntu`
- **Key**: `~/.ssh/zaps_deploy_key`
- **SSH Command**: `ssh -i ~/.ssh/zaps_deploy_key ubuntu@18.118.93.50`

---

## 🤖 AI Agent Protocol

**If you are an AI assistant tasked with deploying this project, follow these strict execution steps:**

1.  **Context Verification**: 
    - Verify you are in the project root.
    - Confirm `deploy.sh` exists.
    - Confirm SSH key exists at `~/.ssh/zaps_deploy_key`.

2.  **Execution**:
    - Do NOT attempt to use GitHub Actions or remote CI/CD unless explicitly asked.
    - Run the deployment script directly:
      ```bash
      chmod +x deploy.sh
      ./deploy.sh
      ```

3.  **Troubleshooting**:
    - If `./deploy.sh` fails permission checks, run `chmod +x deploy.sh` first.
    - If SSH fails, check `ls -l ~/.ssh/zaps_deploy_key` to ensure visibility.
    - The server usage is **Production Data**. Do not run destructive commands (like `docker system prune -a --volumes`) without backing up `.env` files first.

