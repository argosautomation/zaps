# Deployment Guide

Zaps.ai Gateway is designed to be self-hosted using Docker and Docker Compose. This guide will help you get running in production.

## Prerequisites

- **Docker Engine** (24.0+)
- **Docker Compose** (v2.0+)
- A server with at least **2GB RAM** (4GB recommended)

## Quick Start (Pre-built Image)

If you just want to run the gateway without building from source, you can use our official Docker image.

1. **Create a `docker-compose.yml` file:**

```yaml
version: '3.8'

services:
  # 1. Database
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: zaps
      POSTGRES_USER: zaps_user
      POSTGRES_PASSWORD: secure_db_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U zaps_user -d zaps"]
      interval: 10s
      timeout: 5s
      retries: 5

  # 2. Cache
  redis:
    image: redis:alpine
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # 3. Zaps Gateway
  gateway:
    image: zapsai/zaps-gateway:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://zaps_user:secure_db_password@postgres:5432/zaps?sslmode=disable
      - REDIS_URL=redis:6379
      - JWT_SECRET=change_this_to_a_random_secret_string
      # Optional: Mailgun for emails
      # - MAILGUN_API_KEY=...
      # - MAILGUN_DOMAIN=...
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

volumes:
  postgres_data:
  redis_data:
```

2. **Start the stack:**

```bash
docker-compose up -d
```

3. **Run Migrations:**
   The gateway image includes the migration tool.

```bash
docker-compose exec gateway /app/migrate up
```

## Configuration

The Gateway is configured exclusively via Environment Variables.

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port to listen on | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | **Required** |
| `REDIS_URL` | Redis address (e.g. `localhost:6379`) | `localhost:6379` |
| `JWT_SECRET` | Secret for signing session tokens | **Required** |
| `DEEPSEEK_API_KEY` | (Optional) Global key for admin testing | - |
| `MAILGUN_API_KEY` | (Optional) For sending emails | - |

## Security Best Practices

1. **SSL/TLS:**
   The Gateway serves HTTP by default. In production, you **MUST** put a reverse proxy (like Nginx, Caddy, or Traefik) in front of it to handle SSL termination.

2. **Database Passwords:**
   Change the default `POSTGRES_PASSWORD` in your `docker-compose.yml`.

3. **Firewall:**
   Only expose ports `80` and `443` to the public internet. Keep `5432` (Postgres) and `6379` (Redis) blocked or internal-only.
