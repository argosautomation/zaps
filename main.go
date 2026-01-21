package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"regexp"
	"time"

	"io"
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/redis/go-redis/v9"
)

const (
	Port = ":3000"
)

var DeepSeekAPI = "https://api.deepseek.com"
var ctx = context.Background()
var rdb *redis.Client

func init() {
	if env := os.Getenv("DEEPSEEK_API_URL"); env != "" {
		DeepSeekAPI = env
	}
}

// Regex patterns for secret detection
var secretPatterns = map[string]*regexp.Regexp{
	"OPENAI_KEY":   regexp.MustCompile(`sk-[a-zA-Z0-9_-]{20,}`),
	"EMAIL":        regexp.MustCompile(`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`),
	"PHONE":        regexp.MustCompile(`\b\d{3}[-.]?\d{3}[-.]?\d{4}\b`),
	"CREDIT_CARD":  regexp.MustCompile(`\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b`),
	"GITHUB_TOKEN": regexp.MustCompile(`ghp_[a-zA-Z0-9]{36,}`),
	"STRIPE_KEY":   regexp.MustCompile(`sk_live_[a-zA-Z0-9]{24,}`),
	"AWS_KEY":      regexp.MustCompile(`AKIA[0-9A-Z]{16}`),
	"GENERIC_API":  regexp.MustCompile(`(?i)(api[_-]?key|secret[_-]?key|access[_-]?token)[\s:=]+['"]?([a-zA-Z0-9_-]{20,})['"]?`),
}

func main() {
	// Connect to Redis
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "localhost:6379"
	}

	rdb = redis.NewClient(&redis.Options{
		Addr: redisURL,
	})

	// Test Redis connection
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("Warning: Redis not available: %v. Running without caching.", err)
	} else {
		log.Println("✓ Connected to Redis")
	}

	// Setup Fiber
	app := fiber.New(fiber.Config{
		AppName:                 "Zaps.ai Gateway v1.1",
		EnableTrustedProxyCheck: true,
		TrustedProxies:          []string{"0.0.0.0/0"},
		ProxyHeader:             fiber.HeaderXForwardedFor,
	})

	// Middleware
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${method} ${path} (${latency})\n",
	}))

	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization, x-client-id",
	}))

	// --- Admin Routes ---

	// Initialize Admin (Default User & Whitelist)
	InitAdmin(rdb)

	// Admin Static Files (Frontend)
	// We'll apply IP Whitelist to EVERYTHING under /admin
	adminGroup := app.Group("/admin", IPWhitelistMiddleware(rdb))

	// Serve static files
	adminGroup.Static("/", "./public")

	// Admin API
	apiAdmin := app.Group("/api/admin", IPWhitelistMiddleware(rdb))

	// Public Admin Endpoints (Login)
	apiAdmin.Post("/login", HandleLogin(rdb))
	apiAdmin.Post("/logout", HandleLogout(rdb))

	// Protected Admin Endpoints
	SECURED := apiAdmin.Group("/", AdminAuthMiddleware(rdb))
	SECURED.Get("/check-auth", HandleCheckAuth)
	SECURED.Post("/change-password", HandleChangePassword(rdb))

	// Feature Routes
	SECURED.Get("/keys", HandleListKeys(rdb))
	SECURED.Post("/keys", HandleGenerateKey(rdb))
	SECURED.Delete("/keys", HandleDeleteKey(rdb))

	SECURED.Get("/whitelist", HandleListWhitelist(rdb))
	SECURED.Post("/whitelist", HandleAddWhitelist(rdb))
	SECURED.Delete("/whitelist", HandleRemoveWhitelist(rdb))

	SECURED.Get("/config", HandleGetConfig(rdb))
	SECURED.Post("/config", HandleUpdateConfig(rdb))

	SECURED.Get("/users", HandleListUsers(rdb))
	SECURED.Post("/users", HandleCreateUser(rdb))

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "healthy",
			"redis":  rdb.Ping(ctx).Err() == nil,
		})
	})

	// Main proxy endpoint
	// Apply IP Whitelist (Shared with Admin) as per user request
	api := app.Group("/v1", IPWhitelistMiddleware(rdb))
	api.Use(AuthMiddleware(rdb))
	api.Post("/chat/completions", handleChatCompletion)

	log.Printf("🚀 Zaps.ai Gateway starting on %s", Port)
	log.Fatal(app.Listen(Port))
}

func handleChatCompletion(c *fiber.Ctx) error {
	clientID := c.Get("x-client-id", "unknown")

	// Parse request body
	var body map[string]interface{}
	if err := c.BodyParser(&body); err != nil {
		log.Printf("[%s] Invalid JSON: %v", clientID, err)
		return c.Status(400).JSON(fiber.Map{"error": "Invalid JSON"})
	}

	// Track secrets for rehydration
	secretMap := make(map[string]string)

	// Sanitize messages
	if messages, ok := body["messages"].([]interface{}); ok {
		// INJECTION: Add System Prompt to prevent hallucinations
		// We prepend it to ensure it takes precedence or sets context early.
		antiHallucinationMsg := map[string]interface{}{
			"role":    "system",
			"content": "SYSTEM NOTICE: Sensitive data in this conversation has been redacted and replaced with tokens formatted like <SECRET:TYPE:ID>. When replying, you MUST use these tokens exactly as they appear to refer to the redacted entities. DO NOT invent fake data (like 'user@example.com') to replace them. Treat the token as the actual value.",
		}

		// Create new slice with injected message
		newMessages := make([]interface{}, 0, len(messages)+1)
		newMessages = append(newMessages, antiHallucinationMsg)

		for _, msg := range messages {
			if m, ok := msg.(map[string]interface{}); ok {
				if content, ok := m["content"].(string); ok {
					cleanContent, secrets := redactSecrets(content, clientID)
					m["content"] = cleanContent

					// Store secrets for rehydration
					for token, original := range secrets {
						secretMap[token] = original
					}
				}
				newMessages = append(newMessages, m)
			}
		}

		// Update body with new messages
		body["messages"] = newMessages
	}

	// Forward to DeepSeek
	cleanBody, _ := json.Marshal(body)

	req, err := http.NewRequest("POST", DeepSeekAPI+"/chat/completions", bytes.NewReader(cleanBody))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create request"})
	}

	req.Header.Set("Content-Type", "application/json")

	// Config Prioritization: Redis > Env
	apiKey, err := rdb.HGet(ctx, "config:gateway", "deepseek_api_key").Result()
	if err != nil || apiKey == "" {
		apiKey = os.Getenv("DEEPSEEK_API_KEY")
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)

	// Increase timeout to 5 minutes for long-chain reasoning
	client := &http.Client{Timeout: 300 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[%s] DeepSeek error: %v", clientID, err)
		return c.Status(502).JSON(fiber.Map{"error": "DeepSeek unreachable"})
	}
	defer resp.Body.Close()

	// Read response
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to read response"})
	}

	// Rehydrate secrets in response
	rehydratedResponse := rehydrateSecrets(string(responseBody), secretMap)

	c.Set("Content-Type", "application/json")
	return c.Status(resp.StatusCode).SendString(rehydratedResponse)
}

// redactSecrets finds secrets and replaces them with tokens
func redactSecrets(input string, clientID string) (string, map[string]string) {
	secrets := make(map[string]string)
	output := input

	for label, regex := range secretPatterns {
		output = regex.ReplaceAllStringFunc(output, func(match string) string {
			// Generate unique token
			timestamp := time.Now().UnixNano()
			token := fmt.Sprintf("<SECRET:%s:%d>", label, timestamp)

			// Store mapping
			secrets[token] = match

			// Cache in Redis (TTL 10 mins)
			if rdb != nil {
				rdb.Set(ctx, token, match, 10*time.Minute)
				log.Printf("[%s] Redacted %s: %s -> %s", clientID, label, maskSecret(match), token)
			}

			return token
		})
	}

	return output, secrets
}

// rehydrateSecrets restores original secrets from tokens
func rehydrateSecrets(input string, secretMap map[string]string) string {
	output := input

	// First try in-memory map
	for token, original := range secretMap {
		output = replaceAll(output, token, original)
	}

	// Fallback to Redis for any remaining tokens (Handle AI formatting deviations)
	// Lenient Regex: <SECRET : TYPE : ID > (matches whitespace)
	tokenRegex := regexp.MustCompile(`<SECRET:\s*([A-Z_]+)\s*:\s*(\d+)\s*>`)
	output = tokenRegex.ReplaceAllStringFunc(output, func(match string) string {
		// Extract core components
		submatches := tokenRegex.FindStringSubmatch(match)
		if len(submatches) != 3 {
			return match
		}
		label := submatches[1]
		id := submatches[2]

		// Reconstruct strict token for lookup
		strictToken := fmt.Sprintf("<SECRET:%s:%s>", label, id)

		// 1. Check Memory (in case leniency matched something map didn't catch?)
		// Usually map check (above) handles exact matches. This handles malformed ones.
		if val, ok := secretMap[strictToken]; ok {
			return val
		}

		// 2. Check Redis
		if rdb != nil {
			if val, err := rdb.Get(ctx, strictToken).Result(); err == nil {
				return val
			}
		}

		return match // Keep token if not found
	})

	return output
}

func replaceAll(s, old, new string) string {
	return regexp.MustCompile(regexp.QuoteMeta(old)).ReplaceAllString(s, new)
}

func maskSecret(s string) string {
	if len(s) <= 8 {
		return "***"
	}
	return s[:4] + "..." + s[len(s)-4:]
}
