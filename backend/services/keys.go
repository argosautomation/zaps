package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"
)

// APIKey represents a stored API credential in Redis
type APIKey struct {
	Key         string    `json:"key"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	LastUsedAt  time.Time `json:"last_used_at"`
	UsageCount  int64     `json:"usage_count"`
	RateLimit   int       `json:"rate_limit"` // requests per minute
	Enabled     bool      `json:"enabled"`
	OwnerID     string    `json:"owner_id"` // User/Tenant ID
}

const (
	ApiKeyPrefix   = "gk_"
	ApiKeyLength   = 32
	RedisKeyPrefix = "apikey:"
)

// GenerateAPIKey creates a cryptographically secure API key
func GenerateAPIKey() (string, error) {
	bytes := make([]byte, ApiKeyLength)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return ApiKeyPrefix + base64.URLEncoding.EncodeToString(bytes)[:ApiKeyLength], nil
}

// StoreAPIKey saves an API key to Redis
func StoreAPIKey(rdb *redis.Client, apiKey *APIKey) error {
	data, err := json.Marshal(apiKey)
	if err != nil {
		return err
	}

	key := RedisKeyPrefix + apiKey.Key
	return rdb.Set(context.Background(), key, data, 0).Err()
}

// GetAPIKey retrieves an API key from Redis
func GetAPIKey(rdb *redis.Client, key string) (*APIKey, error) {
	redisKey := RedisKeyPrefix + key
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
	redisKey := RedisKeyPrefix + key
	return rdb.Del(context.Background(), redisKey).Err()
}

// ListAPIKeys returns all API keys
func ListAPIKeys(rdb *redis.Client) ([]*APIKey, error) {
	ctx := context.Background()
	pattern := RedisKeyPrefix + "*"

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
