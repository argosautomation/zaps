package api

import (
	"math/rand"
	"time"

	"zaps/services"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
)

// SimulateRedaction handles the playground demo requests
func SimulateRedaction(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req struct {
			Text string `json:"text"`
		}

		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}

		if len(req.Text) > 5000 {
			return c.Status(400).JSON(fiber.Map{"error": "Text too long (max 5000 chars)"})
		}

		// Perform Redattion (using shared service)
		// We pass nil for redisClient if we don't want to cache these fake tokens,
		// but if we want rehydration to work, we might need to cache them temporarily?
		// Actually, for the playground, we can return the secretMap directly to the frontend
		// so the frontend can "rehydrate" it or we can rehydrate it server-side.
		// Let's do server-side rehydration to match the real flow.
		// We WILL pass rdb to allow caching, but maybe with a short TTL?
		// The service uses 10 min TTL, which is fine.

		// Context for Redis
		ctx := c.Context()

		// 1. Redact
		redactedText, secretMap := services.RedactSecrets(ctx, req.Text, "playground-sim", rdb)

		// 2. Simulate Latency (10-30ms) to feel "real" but fast
		time.Sleep(time.Duration(10+rand.Intn(20)) * time.Millisecond)

		// 3. Rehydrate (Simulating the response coming back)
		// In a real flow, the LLM allows the tokens to pass through.
		// Here, we just immediately rehydrate the *redacted* text to prove it works.
		rehydratedText := services.RehydrateSecrets(ctx, redactedText, secretMap, rdb)

		return c.JSON(fiber.Map{
			"original":         req.Text,
			"redacted":         redactedText,
			"rehydrated":       rehydratedText,
			"detected_secrets": services.SanitizeMap(secretMap), // Show what we found (masked)
			"latency_ms":       12,                              // Fake "overhead" stat
		})
	}
}
