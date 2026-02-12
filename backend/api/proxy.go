package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"zaps/db"
	"zaps/services"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
)

var ProviderModels = map[string][]string{
	"openai":    {"gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"},
	"anthropic": {"claude-3-opus", "claude-3-sonnet", "claude-3-5-sonnet", "claude-3-haiku-20240307"},
	"deepseek":  {"deepseek-chat", "deepseek-coder"},
	"gemini": {
		"gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro",
		"gemini-2.5-flash", "gemini-2.5-pro",
		"gemini-pro",
	},
}

const (
	ProviderOpenAI    = "openai"
	ProviderAnthropic = "anthropic"
	ProviderDeepSeek  = "deepseek"
	ProviderGemini    = "gemini"
)

func GetProviderForModel(model string) string {
	for provider, models := range ProviderModels {
		for _, m := range models {
			if m == model {
				return provider
			}
		}
	}
	return ""
}

func GetProviderURL(provider string) string {
	switch provider {
	case ProviderOpenAI:
		return "https://api.openai.com/v1"
	case ProviderAnthropic:
		return "https://api.anthropic.com/v1"
	case ProviderGemini:
		// Gemini OpenAI Compatibility Endpoint
		return "https://generativelanguage.googleapis.com/v1beta/openai"
	case ProviderDeepSeek:
		url := os.Getenv("DEEPSEEK_API_URL")
		if url == "" {
			return "https://api.deepseek.com"
		}
		return url
	default:
		return ""
	}
}

// CheckQuota checks if the tenant has sufficient quota
func CheckQuota(tenantID string) error {
	var current, monthly int
	var overageAllowed bool

	err := db.DB.QueryRow(`
		SELECT current_usage, monthly_quota, overage_allowed 
		FROM tenants 
		WHERE id = $1
	`, tenantID).Scan(&current, &monthly, &overageAllowed)

	if err != nil {
		return err
	}

	if current >= monthly && !overageAllowed {
		return fmt.Errorf("quota exceeded")
	}

	return nil
}

// IncrementUsage increments the tenant's usage count
func IncrementUsage(tenantID string) {
	_, err := db.DB.Exec(`
		UPDATE tenants 
		SET current_usage = current_usage + 1 
		WHERE id = $1
	`, tenantID)
	if err != nil {
		log.Printf("Failed to increment usage for tenant %s: %v", tenantID, err)
	}
}

// HandleChatCompletion is the main proxy handler
func HandleChatCompletion(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		clientID := c.Get("x-client-id", "unknown")
		ownerID, _ := c.Locals("owner_id").(string)
		tenantID, _ := c.Locals("tenant_id").(string) // Ensure AuthMiddleware sets this
		startTime := time.Now()

		// 0. Check Quota
		if err := CheckQuota(tenantID); err != nil {
			return c.Status(402).JSON(fiber.Map{
				"error":   "Quota Exceeded",
				"message": "You have reached your monthly limit. Please upgrade your plan.",
			})
		}

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
		apiKey, err := GetProviderKey(tenantID, provider)

		// Fallback to Global Config for DeepSeek
		if (err != nil || apiKey == "") && provider == ProviderDeepSeek {
			apiKey, _ = rdb.HGet(context.Background(), "config:gateway", "deepseek_api_key").Result()
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
						cleanContent, secrets := services.RedactSecrets(context.Background(), content, clientID, rdb)
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
		var reqBodyBytes []byte

		// Transform request for Anthropic (OpenAI -> Anthropic)
		if provider == ProviderAnthropic {
			anthropicBody, convertErr := ConvertOpenAIToAnthropic(body)
			if convertErr != nil {
				return c.Status(400).JSON(fiber.Map{"error": "Failed to convert request for Anthropic"})
			}
			reqBodyBytes, _ = json.Marshal(anthropicBody)
			targetURL = "https://api.anthropic.com/v1/messages" // Override URL
		} else if provider == ProviderGemini {
			// Remap deprecated Gemini model aliases
			if model, ok := body["model"].(string); ok {
				switch model {
				case "gemini-pro":
					model = "gemini-2.0-flash"
				}
				// Gemini API requires models/ prefix
				if len(model) < 7 || model[:7] != "models/" {
					model = "models/" + model
				}
				body["model"] = model
			}
			reqBodyBytes, _ = json.Marshal(body)
		} else {
			reqBodyBytes, _ = json.Marshal(body)
		}

		req, reqErr := http.NewRequest("POST", targetURL, bytes.NewReader(reqBodyBytes))
		if reqErr != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create request"})
		}

		req.Header.Set("Content-Type", "application/json")

		if provider == "anthropic" {
			req.Header.Set("x-api-key", apiKey)
			req.Header.Set("anthropic-version", "2023-06-01")
		} else {
			req.Header.Set("Authorization", "Bearer "+apiKey)
		}

		// Increase timeout to 5 minutes
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

		// If Anthropic and Success, Convert back to OpenAI format
		if provider == "anthropic" && resp.StatusCode == 200 {
			convertedResp, err := ConvertAnthropicToOpenAI(responseBody)
			if err == nil {
				responseBody = convertedResp
			} else {
				log.Printf("Failed to convert Anthropic response: %v", err)
			}
		}

		// FRICTION REDUCTION: Enhance Error Messages
		if resp.StatusCode >= 400 {
			var errResp map[string]interface{}
			if err := json.Unmarshal(responseBody, &errResp); err == nil {
				// OpenAI Style Error
				if errObj, ok := errResp["error"].(map[string]interface{}); ok {
					msg, _ := errObj["message"].(string)
					code, _ := errObj["code"].(string)
					errType, _ := errObj["type"].(string)

					// 1. OpenAI Quota Issues
					if code == "insufficient_quota" || code == "billing_hard_limit_reached" {
						errObj["message"] = msg + " [ZAPS HELP: Your OpenAI account has no credits. Go to Settings > Billing to add funds.]"
					}

					// 2. Anthropic Tier / Model Issues
					// Note: provider constant is "anthropic" (lowercase) based on line 252 check
					if errType == "not_found_error" && provider == "anthropic" {
						errObj["message"] = msg + " [ZAPS HELP: If using Claude 3.5 Sonnet, you must be Tier 1 (Prepaid $5). Free keys only support Haiku.]"
					}

					// Re-marshal modified error
					if modifiedBody, err := json.Marshal(errResp); err == nil {
						responseBody = modifiedBody
					}
				}
			}
		}

		// Rehydrate secrets in response
		rehydratedResponse := services.RehydrateSecrets(context.Background(), string(responseBody), secretMap, rdb)

		// ASYNC AUDIT LOGGING & USAGE TRACKING
		latency := time.Since(startTime)

		// Increment Usage if successful (Total Tenant Usage)
		if resp.StatusCode == 200 {
			go IncrementUsage(tenantID)
		}

		// Log Hourly Usage Stats (Async)
		isError := resp.StatusCode >= 400
		services.LogRequestUsage(tenantID, latency.Milliseconds(), isError, 0) // Tokens 0 for now

		// Create sanitized event data
		eventData := map[string]interface{}{
			"provider":     provider,
			"model":        model,
			"status":       resp.StatusCode,
			"latency_ms":   latency.Milliseconds(),
			"redacted":     len(secretMap) > 0,
			"redact_count": len(secretMap),
			"request_len":  len(reqBodyBytes),
			"response_len": len(responseBody),
			// Store sanitized secrets for debugging (Masked)
			"pii_details": services.SanitizeMap(secretMap),
		}

		services.LogAuditAsync(ownerID, nil, "PROXY_REQUEST", eventData, c.IP(), c.Get("User-Agent"))

		// PLAYGROUND DEBUG SUPPORT
		if c.Get("X-Zaps-Debug") == "true" {
			c.Set("X-Zaps-Redacted-Content", string(reqBodyBytes))
		}

		c.Set("Content-Type", "application/json")
		return c.Status(resp.StatusCode).SendString(rehydratedResponse)
	}
}

// HandleListModels lists available models
func HandleListModels(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {

		tenantID, _ := c.Locals("tenant_id").(string)

		type Model struct {
			ID      string `json:"id"`
			Object  string `json:"object"`
			OwnedBy string `json:"owned_by"`
		}

		var availableModels []Model

		// Iterate over all supported providers
		for provider, models := range ProviderModels {
			apiKey, err := GetProviderKey(tenantID, provider)

			// Special check for DeepSeek global config fallback
			if (err != nil || apiKey == "") && provider == ProviderDeepSeek {
				apiKey, _ = rdb.HGet(context.Background(), "config:gateway", "deepseek_api_key").Result()
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
}
