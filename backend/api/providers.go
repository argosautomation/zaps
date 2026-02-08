package api

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
)

// ProviderConfig represents a user's configuration for an upstream provider
type ProviderConfig struct {
	Provider string `json:"provider"` // deepseek, openai, anthropic
	Key      string `json:"key"`      // sk-...
	Enabled  bool   `json:"enabled"`
}

const (
	providerKeyPrefix = "provider:"
)

// -- Handlers --

// GetProviders returns a list of configured providers (with masked keys)
func GetProviders(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenantID := c.Locals("tenant_id").(string)

		// List of supported providers to check
		supported := []string{"deepseek", "openai", "anthropic"}

		configs := []map[string]interface{}{}

		for _, p := range supported {
			// Key format: provider:{tenant_id}:{provider_name}
			redisKey := fmt.Sprintf("%s%s:%s", providerKeyPrefix, tenantID, p)

			val, err := rdb.Get(context.Background(), redisKey).Result()
			if err == nil && val != "" {
				// We found a config
				// We don't need to decrypt it to know it's there
				// But let's decrypt to verify integrity? Not strictly needed for list.

				configs = append(configs, map[string]interface{}{
					"provider":   p,
					"configured": true,
					"key_masked": "********", // Never return the real key
				})
			} else {
				configs = append(configs, map[string]interface{}{
					"provider":   p,
					"configured": false,
					"key_masked": "",
				})
			}
		}

		return c.JSON(configs)
	}
}

// UpdateProvider saves (encrypts) a provider key
func UpdateProvider(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenantID := c.Locals("tenant_id").(string)

		var req ProviderConfig
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}

		if req.Provider == "" || req.Key == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Provider and Key are required"})
		}

		// Encrypt
		encrypted, err := Encrypt(req.Key)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Encryption failed"})
		}

		// Save
		redisKey := fmt.Sprintf("%s%s:%s", providerKeyPrefix, tenantID, req.Provider)
		err = rdb.Set(context.Background(), redisKey, encrypted, 0).Err()
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to save configuration"})
		}

		return c.JSON(fiber.Map{"status": "updated", "provider": req.Provider})
	}
}

// DeleteProvider removes a provider configuration
func DeleteProvider(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenantID := c.Locals("tenant_id").(string)
		provider := c.Params("name")

		if provider == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Provider name required"})
		}

		redisKey := fmt.Sprintf("%s%s:%s", providerKeyPrefix, tenantID, provider)
		rdb.Del(context.Background(), redisKey)

		return c.JSON(fiber.Map{"status": "deleted"})
	}
}

// -- Crypto Helpers --

func getEncryptionKey() ([]byte, error) {
	keyHex := os.Getenv("ENCRYPTION_KEY")
	if keyHex == "" {
		return nil, fmt.Errorf("ENCRYPTION_KEY not set")
	}
	return hex.DecodeString(keyHex)
}

func Encrypt(plaintext string) (string, error) {
	key, err := getEncryptionKey()
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return hex.EncodeToString(ciphertext), nil
}

func Decrypt(ciphertextHex string) (string, error) {
	key, err := getEncryptionKey()
	if err != nil {
		return "", err
	}

	data, err := hex.DecodeString(ciphertextHex)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	if len(data) < gcm.NonceSize() {
		return "", fmt.Errorf("malformed ciphertext")
	}

	nonce, ciphertext := data[:gcm.NonceSize()], data[gcm.NonceSize():]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

// Helper for Proxy Logic
func GetProviderKey(rdb *redis.Client, tenantID string, provider string) (string, error) {
	redisKey := fmt.Sprintf("%s%s:%s", providerKeyPrefix, tenantID, provider)
	val, err := rdb.Get(context.Background(), redisKey).Result()
	if err != nil {
		return "", err
	}

	// Decrypt
	return Decrypt(val)
}
