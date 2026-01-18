package main

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
)

// APIKey represents a stored API credential
type APIKey struct {
	Key         string    `json:"key"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	LastUsedAt  time.Time `json:"last_used_at"`
	UsageCount  int64     `json:"usage_count"`
	RateLimit   int       `json:"rate_limit"` // requests per minute
	Enabled     bool      `json:"enabled"`
}

const (
	apiKeyPrefix = "gk_"
	apiKeyLength = 32
	redisKeyPrefix = "apikey:"
)

// GenerateAPIKey creates a cryptographically secure API key
func GenerateAPIKey() (string, error) {
	bytes := make([]byte, apiKeyLength)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return apiKeyPrefix + base64.URLEncoding.EncodeToString(bytes)[:apiKeyLength], nil
}

// StoreAPIKey saves an API key to Redis
func StoreAPIKey(rdb *redis.Client, apiKey *APIKey) error {
	data, err := json.Marshal(apiKey)
	if err != nil {
		return err
	}
	
	key := redisKeyPrefix + apiKey.Key
	return rdb.Set(context.Background(), key, data, 0).Err()
}

// GetAPIKey retrieves an API key from Redis
func GetAPIKey(rdb *redis.Client, key string) (*APIKey, error) {
	redisKey := redisKeyPrefix + key
	data, err := rdb.Get(context.Background(), redisKey).Result()
	if err != nil {
		return nil, err
	}
	
	var apiKey APIKey
	if err := json.Unmarshal([]byte(data), &apiKey); err != nil {
		return nil, err
	}
	
	return &apiKey, nil
}

// UpdateAPIKeyUsage increments usage counter and updates last used timestamp
func UpdateAPIKeyUsage(rdb *redis.Client, key string) error {
	apiKey, err := GetAPIKey(rdb, key)
	if err != nil {
		return err
	}
	
	apiKey.LastUsedAt = time.Now()
	apiKey.UsageCount++
	
	return StoreAPIKey(rdb, apiKey)
}

// DeleteAPIKey removes an API key from Redis
func DeleteAPIKey(rdb *redis.Client, key string) error {
	redisKey := redisKeyPrefix + key
	return rdb.Del(context.Background(), redisKey).Err()
}

// ListAPIKeys returns all API keys
func ListAPIKeys(rdb *redis.Client) ([]*APIKey, error) {
	ctx := context.Background()
	pattern := redisKeyPrefix + "*"
	
	keys, err := rdb.Keys(ctx, pattern).Result()
	if err != nil {
		return nil, err
	}
	
	var apiKeys []*APIKey
	for _, key := range keys {
		data, err := rdb.Get(ctx, key).Result()
		if err != nil {
			continue
		}
		
		var apiKey APIKey
		if err := json.Unmarshal([]byte(data), &apiKey); err != nil {
			continue
		}
		
		apiKeys = append(apiKeys, &apiKey)
	}
	
	return apiKeys, nil
}

// AuthMiddleware validates API keys on incoming requests
func AuthMiddleware(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Extract Authorization header
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(401).JSON(fiber.Map{
				"error": "Missing Authorization header",
				"message": "Please provide an API key: Authorization: Bearer gk_...",
			})
		}
		
		// Parse Bearer token
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(401).JSON(fiber.Map{
				"error": "Invalid Authorization format",
				"message": "Expected: Authorization: Bearer gk_...",
			})
		}
		
		apiKey := parts[1]
		
		// Validate API key format
		if !strings.HasPrefix(apiKey, apiKeyPrefix) {
			return c.Status(401).JSON(fiber.Map{
				"error": "Invalid API key format",
				"message": "API key must start with gk_",
			})
		}
		
		// Check if key exists
		keyData, err := GetAPIKey(rdb, apiKey)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{
				"error": "Invalid API key",
				"message": "API key not found or has been revoked",
			})
		}
		
		// Check if key is enabled
		if !keyData.Enabled {
			return c.Status(403).JSON(fiber.Map{
				"error": "API key disabled",
				"message": "This API key has been disabled",
			})
		}
		
		// Update usage statistics (async to not slow down request)
		go UpdateAPIKeyUsage(rdb, apiKey)
		
		// Store key name in context for logging
		c.Locals("api_key_name", keyData.Name)
		c.Locals("api_key", apiKey)
		
		return c.Next()
	}
}
