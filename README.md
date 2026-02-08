# Zaps.ai - Privacy-First LLM Gateway

⚡ **Zap away PII risks from your AI calls** - Use any LLM API while we protect your sensitive data.

## Project Structure

```
zaps/
├── backend/          # Go gateway + API server
├── frontend/         # Next.js dashboard
├── docs/             # Documentation
└── docker-compose.yml
```

## Quick Start (Development)

### Prerequisites
- Docker & Docker Compose
- Go 1.21+
- Node.js 18+
- PostgreSQL 16 (via Docker)

### 1. Clone & Setup

```bash
git clone https://github.com/yourusername/zaps.git
cd zaps
cp .env.example .env
# Edit .env with your configuration
```

### 2. Start Services

```bash
# Start all services (Postgres, Redis, Gateway, Frontend)
docker-compose up -d

# Run database migrations
cd backend
go run migrations/migrate.go up

# Backend will be available at http://localhost:3000
# Frontend will be available at http://localhost:3001
```

### 3. Create Your First Account

```bash
# Via API
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "you@example.com",
    "password": "your-secure-password",
    "org_name": "My Company"
  }'

# Check your email for verification link
```

## Architecture

### Multi-Tenant Design
- Each organization gets a unique `tenant_id`
- All Redis keys are namespaced: `tenant:{id}:*`
- PostgreSQL stores tenant metadata, users, and billing info
- Complete data isolation between tenants

### PII Protection Flow

```
User App → Gateway → [Redact PII] → LLM API
                ↓
             Redis Cache
                ↓
User App ← Gateway ← [Rehydrate PII] ← LLM Response
```

**Supported PII Types:**
- Email addresses
- Phone numbers
- API keys
- Credit cards (coming soon)
- SSNs (coming soon)

## Development

### Backend (Go)

```bash
cd backend

# Install dependencies
go mod download

# Run tests
go test ./...

# Run locally (without Docker)
export DATABASE_URL=postgres://zaps_user:dev_password@localhost:5432/zaps
export REDIS_URL=localhost:6379
go run main.go
```

### Frontend (Next.js)

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```

## API Documentation

See [docs/api.md](docs/api.md) for complete API reference.

### Quick Example

```bash
# Get your API key from dashboard
export ZAPS_API_KEY=gk_your_key_here

# Use with OpenAI-compatible endpoint
curl -X POST https://api.zaps.ai/v1/chat/completions \
  -H "Authorization: Bearer $ZAPS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{
      "role": "user",
      "content": "My email is john@example.com and phone is 555-1234"
    }]
  }'
```

PII is automatically redacted before sending to the LLM and rehydrated in the response.

## Production Deployment

See [docs/deployment.md](docs/deployment.md) for production setup.

## Environment Variables

See [`.env.example`](.env.example) for complete list.

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection
- `JWT_SECRET` - Secret for signing tokens (min 32 chars)
- `MAILGUN_API_KEY` - For sending emails
- `MAILGUN_DOMAIN` - Your verified Mailgun domain

**Optional:**
- `DEEPSEEK_API_KEY` - For admin testing
- `STRIPE_SECRET_KEY` - For billing (production)
- `STRIPE_WEBHOOK_SECRET` - For Stripe webhooks

## Security

- All PII is masked in logs
- Secrets stored with 10-minute TTL in Redis
- JWT-based authentication
- Rate limiting per tenant
- Email verification required
- bcrypt password hashing (cost 14)

## Monitoring

- Health endpoint: `GET /health`
- Metrics: `GET /metrics` (Prometheus format)
- Logs: Structured JSON via `log/slog`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `go test ./... && npm test`
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE)

## Support

- 📧 Email: support@zaps.ai
- 💬 Discord: [Join our community](https://discord.gg/zaps)
- 📚 Docs: [docs.zaps.ai](https://docs.zaps.ai)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/zaps/issues)

---

**Built with ⚡ by the Zaps.ai team**
