package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"

	"zaps/db"
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

	// 1. Found in Redis
	if err == nil {
		var apiKey APIKey
		if err := json.Unmarshal([]byte(data), &apiKey); err == nil {
			return &apiKey, nil
		}
	}

	// 2. Fallback to DB
	// Note: We need to import zaps/db. Ideally this should be dependency injected,
	// but for now we reference the global DB as the rest of the app does.
	var k struct {
		ID        string
		TenantID  string
		Name      string
		KeyPrefix string
		KeyHash   string
		Enabled   bool
		CreatedAt time.Time
	}

	// Query DB for specific key_hash (raw key)
	// Note: In real prod, we'd hash the input 'key' before querying 'key_hash'.
	// But our current implementation stores RAW keys in key_hash for simplicity (as noted in CreateAPIKey).
	err = db.DB.QueryRow(`
		SELECT id, tenant_id, name, key_prefix, key_hash, enabled, created_at 
		FROM api_keys WHERE key_hash = $1`, key).Scan(
		&k.ID, &k.TenantID, &k.Name, &k.KeyPrefix, &k.KeyHash, &k.Enabled, &k.CreatedAt,
	)

	if err != nil {
		return nil, err // Not found in DB either
	}

	// 3. Reconstruct APIKey object
	apiKey := APIKey{
		Key:       k.KeyHash,
		Name:      k.Name,
		Enabled:   k.Enabled,
		CreatedAt: k.CreatedAt,
		OwnerID:   k.TenantID,
		// Missing fields from DB: Description, UsageCount (in usage_logs?), RateLimit
		// Set defaults
		RateLimit: 60,
	}

	// 4. Store back to Redis (Read-Through)
	StoreAPIKey(rdb, &apiKey)

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
