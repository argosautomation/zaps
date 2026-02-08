---
description: Start the Zaps.ai development environment
---

# Start Development Environment

This workflow starts all Zaps.ai services in development mode.

## Steps

### 1. Copy environment template (first time only)

```bash
cp .env.example .env
```

Edit `.env` and set your configuration (optional for basic dev mode).

### 2. Start all services with Docker Compose

// turbo
```bash
docker-compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Backend Gateway (port 3000)
- Frontend (port 3001)

### 3. Run database migrations

```bash
cd backend && ./migrate
```

If `migrate` doesn't exist:
```bash
cd backend && go build -o migrate ./db/migrate.go && ./migrate
```

### 4. Verify services are running

// turbo
```bash
docker ps
```

You should see 4 containers running.

### 5. Check health

// turbo
```bash
curl http://localhost:3000/health
```

Should return `{"status":"healthy","database":true,"redis":true}`

### 6. Access the application

- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- Admin Dashboard (legacy): http://localhost:3000/admin

## Development Workflow

### Watch logs

```bash
# All services
docker-compose logs -f

# Backend only
docker logs -f zaps-gateway

# Frontend only
docker logs -f zaps-frontend
```

### Restart a service

```bash
docker-compose restart gateway
docker-compose restart frontend
```

### Stop all services

```bash
docker-compose down
```

### Full reset (WARNING: destroys all data)

```bash
docker-compose down -v
docker-compose up -d
cd backend && ./migrate
```

## Troubleshooting

### Port already in use

```bash
# Find what's using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>
```

### Database connection errors

```bash
# Check PostgreSQL logs
docker logs zaps-postgres

# Restart database
docker-compose restart postgres
```

### Frontend not loading

```bash
# Rebuild frontend
cd frontend
rm -rf .next node_modules
npm install
docker-compose restart frontend
```
