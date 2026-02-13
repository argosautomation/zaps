package main

import (
	"encoding/json"
	"fmt"
	"os"

	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"

	"zaps/services"
)

// AuthMiddleware validates API keys OR Session Cookie
func AuthMiddleware(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// 1. Check Authorization Header (API Key)
		authHeader := c.Get("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				apiKey := parts[1]
				if strings.HasPrefix(apiKey, services.ApiKeyPrefix) {
					// Validate API Key
					keyData, err := services.GetAPIKey(rdb, apiKey)
					if err == nil && keyData.Enabled {
						go services.UpdateAPIKeyUsage(rdb, apiKey)

						c.Locals("api_key_name", keyData.Name)
						c.Locals("api_key", apiKey)
						c.Locals("owner_id", keyData.OwnerID)
						c.Locals("tenant_id", keyData.OwnerID)
						return c.Next()
					}
				}
			}
		}

		// 2. Check Session Cookie (Dashboard Access)
		// We prefer the HttpOnly 'session' cookie, but fallback to 'Authorization' header for API clients
		sessionToken := c.Cookies("session")
		if sessionToken != "" {
			token, err := jwt.Parse(sessionToken, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}
				secret := os.Getenv("JWT_SECRET")
				if secret == "" {
					return nil, fmt.Errorf("JWT_SECRET environment variable is not set")
				}
				return []byte(secret), nil
			})

			if err == nil && token.Valid {
				if claims, ok := token.Claims.(jwt.MapClaims); ok {
					userID := claims["user_id"].(string)

					// Check for session invalidation (min_iat)
					minIATStr, err := rdb.Get(c.Context(), fmt.Sprintf("user:%s:min_iat", userID)).Result()
					if err == nil {
						// Key exists, check timestamp
						var minIAT int64
						fmt.Sscanf(minIATStr, "%d", &minIAT)

						// Get token iat
						var iat int64
						switch v := claims["iat"].(type) {
						case float64:
							iat = int64(v)
						case json.Number:
							iat, _ = v.Int64()
						}

						if iat < minIAT {
							return c.Status(401).JSON(fiber.Map{"error": "Session expired. Please log in again."})
						}
					}

					c.Locals("user_id", userID)
					c.Locals("tenant_id", claims["tenant_id"])
					c.Locals("email", claims["email"])
					// Support for Playground (which uses Session, but calls endpoints expecting owner_id)
					c.Locals("owner_id", claims["user_id"])
					return c.Next()
				}
			}
		}

		return c.Status(401).JSON(fiber.Map{
			"error":   "Unauthorized",
			"message": "Valid API Key or Session Cookie required",
		})
	}
}
