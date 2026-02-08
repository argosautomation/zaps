# Zaps.ai SaaS - Development Guide

## Quick Start

### 1. Prerequisites
- Docker & Docker Compose
- Go 1.21+
- Node.js 18+

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration (see below)
```

### 3. Start All Services

```bash
# Start PostgreSQL, Redis, Backend, Frontend
docker-compose up -d

# Run database migrations
cd backend && ./migrate
```

### 4. Access the Application

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## Environment Variables

### Required (Dev Mode Works Without These)

```bash
# Database
DATABASE_URL=postgres://zaps_user:dev_password@localhost:5432/zaps?sslmode=disable

# Redis
REDIS_URL=localhost:6379

# JWT Secret (generate a random 32-char string)
JWT_SECRET=your-random-secret-here
```

### Optional (For Full Functionality)

```bash
# Mailgun (for email verification)
MAILGUN_API_KEY=your-mailgun-key
MAILGUN_DOMAIN=mg.zaps.ai

# LLM API (for admin testing)
DEEPSEEK_API_KEY=sk-your-key

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3001
```

## Development Workflow

### Backend Development

```bash
cd backend

# Install dependencies
go mod download

# Run locally (without Docker)
export DATABASE_URL=postgres://zaps_user:dev_password@localhost:5432/zaps
go run main.go

# Run tests
go test ./...

# Build
go build -o gateway main.go
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Run dev server with hot reload
npm run dev

# Build for production
npm run build
```

### Database Migrations

```bash
cd backend

# Run migrations
./migrate

# Create new migration
# 1. Create files: db/migrations/002_your_migration.{up,down}.sql
# 2. Run ./migrate
```

## Testing the Registration Flow

### 1. Sign Up

```bash
# Via frontend
open http://localhost:3001/signup

# Or via API
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "supersecurepassword123",
    "org_name": "Test Company"
  }'
```

### 2. Email Verification

**Dev Mode (No Mailgun)**:
- Check backend logs for verification link
- Copy the link and open in browser

**With Mailgun**:
- Check your email inbox
- Click verification link

### 3. Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "supersecurepassword123"
  }'
```

## API Endpoints

### Authentication

```
POST   /auth/register      - Create account
GET    /auth/verify        - Verify email (query: token)
POST   /auth/login         - Login
POST   /auth/logout        - Logout
```

### Gateway (Legacy Admin - will be replaced)

```
POST   /admin/login        - Admin login
GET    /admin/keys         - List API keys
POST   /admin/keys         - Generate key
```

### PII Redaction Proxy

```
POST   /v1/chat/completions   - OpenAI-compatible endpoint with PII protection
```

## Troubleshooting

### Database Connection Errors

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs zaps-postgres

# Restart database
docker-compose restart postgres
```

### Migration Errors

```bash
# Reset database (CAUTION: destroys all data)
docker-compose down -v
docker-compose up -d postgres
cd backend && ./migrate
```

### Frontend Build Errors

```bash
cd frontend
rm -rf .next node_modules
npm install
npm run dev
```

## What's Implemented (Phase 1)

✅ **Infrastructure**:
- PostgreSQL with multi-tenant schema
- Redis for caching
- Docker Compose setup

✅ **Backend**:
- User registration with email verification
- Login/logout with session management
- Password hashing (bcrypt)
- Account locking after failed attempts
- Database connection pooling

✅ **Frontend**:
- Landing page with hero, features, pricing
- Signup form with validation
- Email verification page
- Responsive design with Zaps branding

✅ **Email Service**:
- Mailgun integration
- Beautiful HTML email templates
- Dev mode (logs links instead of sending)

## What's Next (Phase 2)

- [ ] Customer dashboard
- [ ] API key management UI
- [ ] Usage analytics charts
- [ ] Sandbox environment
- [ ] Billing integration (Stripe)

## Need Help?

- Check backend logs: `docker logs zaps-gateway`
- Check frontend logs: `docker logs zaps-frontend`
- Database console: `docker exec -it zaps-postgres psql -U zaps_user -d zaps`
