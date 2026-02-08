# API Reference

The Zaps.ai Gateway exposes a RESTful API for authentication, management, and the core LLM proxy functionality.

## Base URL

```
http://localhost:3000
```
(Or your configured `APP_URL` in production)

---

## Authentication

### Register a New Organization
Create a new tenant account.

**POST** `/auth/register`

| Field | Type | Description |
|-------|------|-------------|
| `email` | string | **Required**. Admin email address. |
| `password` | string | **Required**. Min 12 characters. |
| `org_name` | string | **Optional**. Name of your organization. |

**Response (201 Created):**
```json
{
  "message": "Registration successful! Please check your email to verify your account.",
  "user_id": "uuid-string"
}
```

### Login
Authenticate to get a session cookie.

**POST** `/auth/login`

| Field | Type | Description |
|-------|------|-------------|
| `email` | string | **Required**. |
| `password` | string | **Required**. |

**Response (200 OK):**
```json
{
  "token": "jwt-string",
  "user": { ... }
}
```
*Sets `session` HTTP-only cookie.*

---

## LLM Gateway (PII Protected)

The core functionality of Zaps.ai. This endpoint mimics the OpenAI Chat Completions API but adds a PII redaction layer.

### Chat Completions
Send a prompt to an LLM with automatic PII redaction.

**POST** `/v1/chat/completions`

**Headers:**
- `Authorization: Bearer <YOUR_ZAPS_API_KEY>`
- `Content-Type: application/json`

**Body:**
Consistent with OpenAI API.

| Field | Type | Description |
|-------|------|-------------|
| `model` | string | Target model (e.g., `deepseek-chat`, `gpt-4`). |
| `messages` | array | List of message objects (`role`, `content`). |
| `stream` | boolean | **Not yet supported**. |

**Example Request:**
```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer gk_..." \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [
      {"role": "user", "content": "My email is alice@example.com"}
    ]
  }'
```

**What Happens:**
1. **Redaction:** `alice@example.com` is replaced with `<SECRET:EMAIL:12345>`.
2. **Forwarding:** The sanitized prompt is sent to the LLM (e.g., DeepSeek).
3. **Response:** The LLM responds using the token.
4. **Rehydration:** The Gateway replaces `<SECRET:EMAIL:12345>` back to `alice@example.com` before returning the response to you.
5. **Logging:** The PII is never logged in plaintext.

### List Models
Get a list of available models from configured providers.

**GET** `/v1/models`

**Headers:**
- `Authorization: Bearer <YOUR_ZAPS_API_KEY>`

**Response:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "deepseek-chat",
      "object": "model",
      "owned_by": "deepseek"
    }
  ]
}
```

---

## Health Check

**GET** `/health`

Returns the status of the gateway and its dependencies (Postgres, Redis).

**Response:**
```json
{
  "status": "healthy",
  "database": true,
  "redis": true,
  "version": "2.0.0"
}
```
