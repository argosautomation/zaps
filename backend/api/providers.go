package api

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"zaps/db"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// ProviderConfig represents a user's configuration for an upstream provider
type ProviderConfig struct {
	Provider string `json:"provider"` // deepseek, openai, anthropic
	Key      string `json:"key"`      // sk-...
	Enabled  bool   `json:"enabled"`
}

// -- Handlers --

// GetProviders returns a list of configured providers (with masked keys)
func GetProviders(c *fiber.Ctx) error {
	tenantID, _ := uuid.Parse(c.Locals("tenant_id").(string))

	// List of supported providers to check
	supported := []string{"deepseek", "openai", "anthropic", "gemini"}

	// Query DB for existing keys
	rows, err := db.DB.Query("SELECT provider FROM provider_keys WHERE tenant_id = $1 AND enabled = true", tenantID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch providers"})
	}
	defer rows.Close()

	configured := make(map[string]bool)
	for rows.Next() {
		var provider string
		if err := rows.Scan(&provider); err == nil {
			configured[provider] = true
		}
	}

	configs := []map[string]interface{}{}
	for _, p := range supported {
		isConfigured := configured[p]
		mask := ""
		if isConfigured {
			mask = "********"
		}

		configs = append(configs, map[string]interface{}{
			"provider":   p,
			"configured": isConfigured,
			"key_masked": mask,
		})
	}

	return c.JSON(configs)
}

// UpdateProvider saves (encrypts) a provider key to the database
func UpdateProvider(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenantID, _ := uuid.Parse(c.Locals("tenant_id").(string))

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

		// Upsert into DB
		_, err = db.DB.Exec(`
			INSERT INTO provider_keys (tenant_id, provider, encrypted_key, enabled, updated_at)
			VALUES ($1, $2, $3, true, NOW())
			ON CONFLICT (tenant_id, provider) 
			DO UPDATE SET encrypted_key = EXCLUDED.encrypted_key, enabled = true, updated_at = NOW()
		`, tenantID, req.Provider, encrypted)

		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to save configuration"})
		}

		return c.JSON(fiber.Map{"status": "updated", "provider": req.Provider})
	}
}

// DeleteProvider removes a provider configuration
func DeleteProvider(c *fiber.Ctx) error {
	tenantID, _ := uuid.Parse(c.Locals("tenant_id").(string))
	provider := c.Params("name")

	if provider == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Provider name required"})
	}

	_, err := db.DB.Exec("DELETE FROM provider_keys WHERE tenant_id = $1 AND provider = $2", tenantID, provider)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete provider"})
	}

	return c.JSON(fiber.Map{"status": "deleted"})
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
func GetProviderKey(tenantID string, provider string) (string, error) {
	var encryptedKey string
	err := db.DB.QueryRow("SELECT encrypted_key FROM provider_keys WHERE tenant_id = $1 AND provider = $2 AND enabled = true",
		tenantID, provider).Scan(&encryptedKey)

	if err != nil {
		return "", err
	}

	// Decrypt
	return Decrypt(encryptedKey)
}
