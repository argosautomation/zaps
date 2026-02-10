package services

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math/big"
	"time"
	"zaps/db"

	"github.com/redis/go-redis/v9"
)

const (
	DeviceCodeTTL = 10 * time.Minute
	PollInterval  = 5 // seconds
)

type DeviceAuthRequest struct {
	DeviceCode      string `json:"device_code"`
	UserCode        string `json:"user_code"`
	VerificationURI string `json:"verification_uri"`
	ExpiresIn       int    `json:"expires_in"`
	Interval        int    `json:"interval"`
}

type DeviceTokenResponse struct {
	AccessToken string `json:"access_token,omitempty"`
	TokenType   string `json:"token_type,omitempty"`
	Error       string `json:"error,omitempty"`
}

// Store struct for Redis
type DeviceCodeState struct {
	Status  string `json:"status"`             // pending, approved, denied
	OwnerID string `json:"owner_id,omitempty"` // User who approved it
}

// RequestDeviceCode generates codes and stores them in Redis
func RequestDeviceCode(rdb *redis.Client) (*DeviceAuthRequest, error) {
	// 1. Generate User Code (8 chars, readable) -> e.g. "WDJB-MJCG"
	userCode, err := generateUserCode()
	if err != nil {
		return nil, err
	}

	// 2. Generate Device Code (High entropy secret)
	deviceCode, err := GenerateAPIKey() // Reusing the secure random string generator from keys.go
	if err != nil {
		return nil, err
	}

	// 3. Store in Redis
	// Mapping: user_code -> device_code (for looking up when user enters code)
	// Mapping: device_code -> state (for polling status)
	ctx := context.Background()
	pipe := rdb.Pipeline()

	// Parseable User Code -> Device Code
	pipe.Set(ctx, "device:user:"+userCode, deviceCode, DeviceCodeTTL)

	// Device Code -> Status
	state := DeviceCodeState{Status: "pending"}
	data, _ := json.Marshal(state)
	pipe.Set(ctx, "device:state:"+deviceCode, data, DeviceCodeTTL)

	if _, err := pipe.Exec(ctx); err != nil {
		return nil, err
	}

	return &DeviceAuthRequest{
		DeviceCode:      deviceCode,
		UserCode:        userCode,
		VerificationURI: "https://zaps.ai/activate", // In dev this will be localhost:3001/activate
		ExpiresIn:       int(DeviceCodeTTL.Seconds()),
		Interval:        PollInterval,
	}, nil
}

// ApproveDevice is called when user enters the code on the web
func ApproveDevice(rdb *redis.Client, userCode string, ownerID string) error {
	ctx := context.Background()

	// 1. Lookup device code from user code
	deviceCode, err := rdb.Get(ctx, "device:user:"+userCode).Result()
	if err == redis.Nil {
		return fmt.Errorf("invalid_code")
	} else if err != nil {
		return err
	}

	// 2. Update status to approved
	state := DeviceCodeState{
		Status:  "approved",
		OwnerID: ownerID,
	}
	data, _ := json.Marshal(state)

	return rdb.Set(ctx, "device:state:"+deviceCode, data, DeviceCodeTTL).Err()
}

// PollToken checks if the user has approved the request
func PollToken(rdb *redis.Client, deviceCode string) (*DeviceTokenResponse, error) {
	ctx := context.Background()

	// 1. Check state
	data, err := rdb.Get(ctx, "device:state:"+deviceCode).Result()
	if err == redis.Nil {
		return &DeviceTokenResponse{Error: "expired_token"}, nil
	} else if err != nil {
		return nil, err
	}

	var state DeviceCodeState
	if err := json.Unmarshal([]byte(data), &state); err != nil {
		return nil, err
	}

	if state.Status == "pending" {
		return &DeviceTokenResponse{Error: "authorization_pending"}, nil
	}

	if state.Status == "denied" {
		return &DeviceTokenResponse{Error: "access_denied"}, nil
	}

	if state.Status == "approved" {
		// 2. Resolve Tenant ID from User ID (OwnerID)
		// API Keys must be owned by the Tenant for Quota checks to work
		var tenantID string
		err := db.DB.QueryRow("SELECT tenant_id FROM users WHERE id = $1", state.OwnerID).Scan(&tenantID)
		if err != nil {
			return nil, fmt.Errorf("failed to resolve tenant: %v", err)
		}

		// 3. Generate actual API Key for the IDE
		// We create a permanent key now
		newKey, err := GenerateAPIKey()
		if err != nil {
			return nil, err
		}

		apiKeyStruct := &APIKey{
			Key:         newKey,
			Name:        "Void IDE Device", // Default name
			Description: "Generated via Zaps Connect",
			CreatedAt:   time.Now(),
			Enabled:     true,
			OwnerID:     tenantID, // MUST be TenantID for AuthMiddleware/CheckQuota
			RateLimit:   1000,
		}

		if err := StoreAPIKey(rdb, apiKeyStruct); err != nil {
			return nil, err
		}

		// 3. Delete the pending state so it can't be used again
		rdb.Del(ctx, "device:state:"+deviceCode)

		return &DeviceTokenResponse{
			AccessToken: newKey,
			TokenType:   "Bearer",
		}, nil
	}

	return &DeviceTokenResponse{Error: "server_error"}, nil
}

// Helper: Generate BCDF-GHJK style code (no vowels to avoid bad words)
func generateUserCode() (string, error) {
	const charset = "BCDFGHJKLMNPQRSTVWXZ" // 20 chars
	b := make([]byte, 8)
	for i := range b {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			return "", err
		}
		b[i] = charset[n.Int64()]
	}
	// Format: WDJB-MJCG
	return string(b[:4]) + "-" + string(b[4:]), nil
}
