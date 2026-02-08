package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/redis/go-redis/v9"

	"zaps/api"
	"zaps/db"
	"zaps/services"
)

const Port = ":3000"

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
	"GENERIC_API":  regexp.MustCompile(`(?i)(api[_-]?key|secret[_-]?key|access[_-]?token)[\s:=]+['\"]?([a-zA-Z0-9_-]{20,})['\"]?`),
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
		log.Printf("⚠️  Redis not available: %v. Running without caching.", err)
	} else {
		log.Println("✓ Connected to Redis")
	}

	// Initialize PostgreSQL
	if err := db.InitDB(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.CloseDB()

	// Initialize Email Service (Mailgun)
	services.InitMailgun()

	// Initialize Admin Dashboard (legacy system)
	InitAdmin(rdb)

	// Setup Fiber
	app := fiber.New(fiber.Config{
		AppName:                 "Zaps.ai Gateway v2.0",
		EnableTrustedProxyCheck: true,
		TrustedProxies:          []string{"0.0.0.0/0"},
		ProxyHeader:             fiber.HeaderXForwardedFor,
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{"error": err.Error()})
		},
	})

	// Middleware
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${method} ${path} (${latency})\n",
	}))

	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = "*"
	}

	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3001, http://localhost:3000, https://app.glassdesk.ai, https://glassdesk.ai, https://zaps.ai, https://www.zaps.ai, https://api.zaps.ai",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, x-client-id",
		AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS",
		AllowCredentials: true,
	}))

	// ==============================================
	// PUBLIC ROUTES
	// ==============================================

	// Health Check
	app.Get("/health", func(c *fiber.Ctx) error {
		dbHealthy := db.HealthCheck() == nil
		redisHealthy := rdb.Ping(ctx).Err() == nil

		status := "healthy"
		code := 200
		if !dbHealthy || !redisHealthy {
			status = "degraded"
			code = 503
		}

		return c.Status(code).JSON(fiber.Map{
			"status":   status,
			"database": dbHealthy,
			"redis":    redisHealthy,
			"version":  "2.0.0",
		})
	})

	// ==============================================
	// AUTHENTICATION ROUTES (New SaaS)
	// ==============================================

	authGroup := app.Group("/auth")
	authGroup.Post("/register", api.HandleRegister)
	authGroup.Get("/verify", api.HandleVerifyEmail)
	authGroup.Post("/login", api.HandleLogin)
	authGroup.Post("/logout", api.HandleLogout)
	authGroup.Post("/password/forgot", api.HandleRequestPasswordReset)
	authGroup.Post("/password/reset", api.HandleResetPassword)
	// Device Auth (RFC 8628)
	authGroup.Post("/device/code", func(c *fiber.Ctx) error {
		code, err := services.RequestDeviceCode(rdb)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to generate device code"})
		}
		return c.JSON(code)
	})
	authGroup.Post("/device/token", func(c *fiber.Ctx) error {
		var req struct {
			DeviceCode string `json:"device_code"`
		}
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}
		token, err := services.PollToken(rdb, req.DeviceCode)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		if token.Error != "" {
			// RFC 8628 says authorization_pending should be 400 (Bad Request) or similar, but
			// standard is often 400 with specific error code.
			// Example: { "error": "authorization_pending" }
			return c.Status(400).JSON(token)
		}
		return c.JSON(token)
	})

	// ==============================================
	// DASHBOARD & NEW ADMIN ROUTES (New SaaS)
	// ==============================================

	apiGroup := app.Group("/api")

	// Protected Dashboard API
	dashboard := apiGroup.Group("/dashboard", AuthMiddleware(rdb))
	dashboard.Get("/stats", api.GetDashboardStats)
	dashboard.Get("/keys", api.GetAPIKeys)
	dashboard.Post("/keys", api.CreateAPIKey(rdb))
	dashboard.Delete("/keys/:id", api.RevokeAPIKey)
	dashboard.Get("/logs", api.GetAuditLogs)
	dashboard.Get("/providers", api.GetProviders(rdb))
	dashboard.Post("/providers", api.UpdateProvider(rdb))
	dashboard.Delete("/providers/:name", api.DeleteProvider(rdb))

	// User & Organization Management
	dashboard.Get("/profile", api.GetProfile)
	dashboard.Put("/profile", api.UpdateProfile)
	dashboard.Get("/organization", api.GetOrganization)
	dashboard.Put("/organization", api.UpdateOrganization)
	dashboard.Post("/security/password", api.ChangePassword)
	dashboard.Get("/security/status", api.GetSecurityStatus)
	dashboard.Post("/security/2fa/generate", api.Generate2FA)
	dashboard.Post("/security/2fa/enable", api.Enable2FA)
	dashboard.Post("/security/2fa/disable", api.Disable2FA)

	// Device Approval
	dashboard.Post("/device/approve", func(c *fiber.Ctx) error {
		ownerID := c.Locals("owner_id").(string)
		var req struct {
			UserCode string `json:"user_code"`
		}
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}

		if err := services.ApproveDevice(rdb, req.UserCode, ownerID); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid or expired code"})
		}

		services.LogAuditAsync(c.Locals("tenant_id").(string), nil, "DEVICE_APPROVED", map[string]interface{}{"user_code": req.UserCode}, c.IP(), c.Get("User-Agent"))

		return c.JSON(fiber.Map{"status": "approved"})
	})

	// Admin Routes (Protected)
	// admin := apiGroup.Group("/admin", AuthMiddleware(rdb))

	// ==============================================
	// LEGACY ADMIN ROUTES (Old System)
	// ==============================================

	// Admin Static Files (IP Whitelist Protected)
	adminGroup := app.Group("/admin", IPWhitelistMiddleware(rdb))
	adminGroup.Static("/", "./public")

	// Admin API
	apiAdmin := app.Group("/api/admin")

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

	// Provider Config
	SECURED.Get("/providers", HandleGetProviders(rdb))
	SECURED.Post("/providers", HandleUpdateProviders(rdb))

	// ==============================================
	// GATEWAY PROXY (PII Redaction)
	// ==============================================

	// Main proxy endpoint (Protected by API Key auth only)
	apiProxy := app.Group("/v1")
	apiProxy.Use(AuthMiddleware(rdb))
	apiProxy.Post("/chat/completions", handleChatCompletion)
	apiProxy.Get("/models", handleListModels)

	log.Printf("🚀 Zaps.ai Gateway starting on %s", Port)
	log.Fatal(app.Listen(Port))
}

func handleChatCompletion(c *fiber.Ctx) error {
	clientID := c.Get("x-client-id", "unknown")
	ownerID, _ := c.Locals("owner_id").(string) // Added by AuthMiddleware
	startTime := time.Now()

	// Parse request body
	var body map[string]interface{}
	if err := c.BodyParser(&body); err != nil {
		log.Printf("[%s] Invalid JSON: %v", clientID, err)
		return c.Status(400).JSON(fiber.Map{"error": "Invalid JSON"})
	}

	// 1. Determine Provider
	var model string
	if m, ok := body["model"].(string); ok {
		model = m
	}
	provider := GetProviderForModel(model)
	if provider == "" {
		provider = ProviderDeepSeek
	}

	// 2. Resolve Credentials
	// Old: apiKey, _ := GetProviderKey(rdb, ownerID, provider)
	// New: Use api.GetProviderKey which checks tenant-specific crypto storage
	apiKey, _ := api.GetProviderKey(rdb, ownerID, provider)

	// Fallback to Global Config for DeepSeek (DISABLED FOR VERIFICATION)
	if apiKey == "" && provider == ProviderDeepSeek {
		apiKey, _ = rdb.HGet(ctx, "config:gateway", "deepseek_api_key").Result()
		if apiKey == "" {
			apiKey = os.Getenv("DEEPSEEK_API_KEY")
		}
	}

	if apiKey == "" {
		return c.Status(402).JSON(fiber.Map{
			"error":   "Provider not configured",
			"message": fmt.Sprintf("Please configure an API Key for %s in your Dashboard", provider),
		})
	}

	// 3. Resolve Target Endpoint
	baseURL := GetProviderURL(provider)
	targetURL := baseURL + "/chat/completions"

	if provider == ProviderAnthropic {
		return c.Status(400).JSON(fiber.Map{"error": "Anthropic requires /v1/messages endpoint. Auto-translation coming soon."})
	}

	// Track secrets for rehydration
	secretMap := make(map[string]string)

	// Sanitize messages
	if messages, ok := body["messages"].([]interface{}); ok {
		// INJECTION: Add System Prompt to prevent hallucinations
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

	// Forward to Upstream
	cleanBody, _ := json.Marshal(body)

	req, err := http.NewRequest("POST", targetURL, bytes.NewReader(cleanBody))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create request"})
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	// Increase timeout to 5 minutes for long-chain reasoning
	client := &http.Client{Timeout: 300 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[%s] Upstream error (%s): %v", clientID, provider, err)
		return c.Status(502).JSON(fiber.Map{"error": "Upstream provider unreachable"})
	}
	defer resp.Body.Close()

	// Read response
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to read response"})
	}

	// Rehydrate secrets in response
	rehydratedResponse := rehydrateSecrets(string(responseBody), secretMap)

	// ASYNC AUDIT LOGGING
	latency := time.Since(startTime)

	// Create sanitized event data
	eventData := map[string]interface{}{
		"provider":     provider,
		"model":        model,
		"status":       resp.StatusCode,
		"latency_ms":   latency.Milliseconds(),
		"redacted":     len(secretMap) > 0,
		"redact_count": len(secretMap),
		"request_len":  len(cleanBody),
		"response_len": len(responseBody),
		// Store sanitized secrets for debugging (Masked)
		"pii_details": sanitizeMap(secretMap),
	}

	services.LogAuditAsync(ownerID, nil, "PROXY_REQUEST", eventData, c.IP(), c.Get("User-Agent"))

	// PLAYGROUND DEBUG SUPPORT
	// If the user requested debug info AND they are the owner (which they are if they passed auth), return the redacted map
	if c.Get("X-Zaps-Debug") == "true" {
		c.Set("X-Zaps-Redacted-Content", string(cleanBody))
		// We can also return the secret map as JSON header or similar if needed for full reconstruction
		// For now, let's just return the CLEAN BODY as a header so the UI can compare
	}

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
		if input != replaceAll(input, token, original) {
			output = replaceAll(output, token, original)
			if regexp.MustCompile(regexp.QuoteMeta(token)).MatchString(input) {
				log.Printf("[Rehydration] Restored %s -> %s", token, maskSecret(original))
			}
		}
	}

	// Fallback to Redis for any remaining tokens
	tokenRegex := regexp.MustCompile(`<SECRET:\s*([A-Z_]+)\s*:\s*(\d+)\s*>`)
	output = tokenRegex.ReplaceAllStringFunc(output, func(match string) string {
		submatches := tokenRegex.FindStringSubmatch(match)
		if len(submatches) != 3 {
			return match
		}
		label := submatches[1]
		id := submatches[2]

		strictToken := fmt.Sprintf("<SECRET:%s:%s>", label, id)

		if val, ok := secretMap[strictToken]; ok {
			return val
		}

		if rdb != nil {
			if val, err := rdb.Get(ctx, strictToken).Result(); err == nil {
				log.Printf("[Rehydration] Restored (Redis) %s -> %s", strictToken, maskSecret(val))
				return val
			}
		}

		return match
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

func handleListModels(c *fiber.Ctx) error {
	ownerID, _ := c.Locals("owner_id").(string)

	type Model struct {
		ID      string `json:"id"`
		Object  string `json:"object"`
		OwnedBy string `json:"owned_by"`
	}

	var availableModels []Model

	// Iterate over all supported providers
	for provider, models := range ProviderModels {
		// Check if user has a key for this provider
		// We use api.GetProviderKey to check existence (and validity conceptually),
		// though we don't need the actual key value here.
		apiKey, err := api.GetProviderKey(rdb, ownerID, provider)

		// Special check for DeepSeek global config fallback
		// (Matching logic in handleChatCompletion - if not found in user config, check global)
		// NOTE: logic matches handleChatCompletion L302 roughly
		if (err != nil || apiKey == "") && provider == ProviderDeepSeek {
			apiKey, _ = rdb.HGet(ctx, "config:gateway", "deepseek_api_key").Result()
			if apiKey == "" {
				apiKey = os.Getenv("DEEPSEEK_API_KEY")
			}
		}

		// If we found a valid key string, add models
		if apiKey != "" {
			for _, m := range models {
				availableModels = append(availableModels, Model{
					ID:      m,
					Object:  "model",
					OwnedBy: provider,
				})
			}
		}
	}

	return c.JSON(fiber.Map{
		"object": "list",
		"data":   availableModels,
	})
}

// sanitizeMap creates a copy of the secret map with masked values
func sanitizeMap(secrets map[string]string) map[string]string {
	sanitized := make(map[string]string)
	for k, v := range secrets {
		sanitized[k] = maskSecret(v)
	}
	return sanitized
}
