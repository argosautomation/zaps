# Zaps.ai Gateway

A high-performance, secure API Gateway written in Go (Fiber). It provides:
- **Redaction**: Automatically detects and replaces PII (Email, Phone, CC) with secure tokens before sending to LLMs.
- **Rehydration**: Restores original data in LLM responses transparently.
- **Access Control**: IP Whitelisting and API Key Management via a dedicated Admin Dashboard.
- **Anti-Hallucination**: System prompts to ensure data integrity.

## Deployment

Deploy with Docker Compose:

```bash
docker-compose up -d --build
```

## Configuration

Set the following Environment Variables (or in `.env`):
- `REDIS_URL`: Redis connection string.
- `DEEPSEEK_API_KEY`: Your LLM provider key.

## Admin Dashboard

Access `/admin` to manage API keys and Whitelisted IPs. Default credentials should be changed immediately upon first login.
