package api

import (
	"fmt"
	"log"
	"math/rand"
	"time"

	"zaps/services"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
)

// SimulateRedaction handles the playground demo requests
func SimulateRedaction(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ip := c.IP()
		ctx := c.Context()

		// --- RATE LIMITING STRATEGY ---
		// 1. Speed Limit: 5 requests / minute
		// 2. Daily Cap: 30 requests / day
		// 3. Tarpit: 10s delay if over limit

		speedKey := fmt.Sprintf("rate:playground:speed:%s", ip)
		dailyKey := fmt.Sprintf("rate:playground:daily:%s", ip)

		// Check Daily Cap
		dailyCount, _ := rdb.Get(ctx, dailyKey).Int()
		if dailyCount >= 30 {
			// TARPIT: Simulate slow load then fail
			time.Sleep(10 * time.Second)
			return c.Status(429).JSON(fiber.Map{
				"error":   "Daily limit exceeded",
				"message": "You have reached the free demo limit for today. Please contact sales for a full trial.",
			})
		}

		// Check Speed Limit
		speedCount, err := rdb.Incr(ctx, speedKey).Result()
		if err != nil {
			log.Printf("Redis error: %v", err) // Fail open if Redis down
		} else {
			if speedCount == 1 {
				rdb.Expire(ctx, speedKey, 60*time.Second)
			}
			if speedCount > 5 {
				return c.Status(429).JSON(fiber.Map{
					"error":   "Too many requests",
					"message": "Please slow down. Max 5 requests per minute.",
				})
			}
		}

		// Increment Daily Counter
		rdb.Incr(ctx, dailyKey)
		if dailyCount == 0 {
			rdb.Expire(ctx, dailyKey, 24*time.Hour)
		}

		// --- END RATE LIMITING ---

		var req struct {
			Text string `json:"text"`
		}

		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}

		if len(req.Text) > 5000 {
			return c.Status(400).JSON(fiber.Map{"error": "Text too long (max 5000 chars)"})
		}

		// Perform Redaction
		redactedText, secretMap := services.RedactSecrets(ctx, req.Text, "playground-sim", rdb)

		// Simulate Latency (10-30ms) to feel "real" but fast
		time.Sleep(time.Duration(10+rand.Intn(20)) * time.Millisecond)

		// Rehydrate
		rehydratedText := services.RehydrateSecrets(ctx, redactedText, secretMap, rdb)

		return c.JSON(fiber.Map{
			"original":         req.Text,
			"redacted":         redactedText,
			"rehydrated":       rehydratedText,
			"detected_secrets": services.SanitizeMap(secretMap),
			"latency_ms":       12,
		})
	}
}
