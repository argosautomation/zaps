package api

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"zaps/db"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// GetDashboardStats returns aggregated usage statistics for the dashboard
func GetDashboardStats(c *fiber.Ctx) error {
	tenantID, _ := uuid.Parse(c.Locals("tenant_id").(string))

	// Get total requests for today
	var requestsToday int64
	today := time.Now().Truncate(24 * time.Hour)
	err := db.DB.QueryRow(`
		SELECT COALESCE(SUM(request_count), 0)
		FROM usage_logs
		WHERE tenant_id = $1 AND hour_bucket >= $2
	`, tenantID, today).Scan(&requestsToday)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch stats"})
	}

	// Get active keys count
	var activeKeys int64
	db.DB.QueryRow("SELECT COUNT(*) FROM api_keys WHERE tenant_id = $1 AND enabled = true", tenantID).Scan(&activeKeys)

	// Mock PII redacted count (since we store it in JSONB, simpler query for now)
	// In production, you'd extract this from the JSONB pii_events
	var piiRedacted int64
	db.DB.QueryRow(`
		SELECT COALESCE(SUM((pii_events->>'redacted_count')::int), 0)
		FROM usage_logs
		WHERE tenant_id = $1 AND hour_bucket >= $2
	`, tenantID, today).Scan(&piiRedacted)

	return c.JSON(fiber.Map{
		"requests_today": requestsToday,
		"active_keys":    activeKeys,
		"pii_redacted":   piiRedacted,
	})
}

// GetAPIKeys lists all API keys for the tenant
func GetAPIKeys(c *fiber.Ctx) error {
	tenantID, _ := uuid.Parse(c.Locals("tenant_id").(string))

	rows, err := db.DB.Query(`
		SELECT id, name, key_prefix, created_at, last_used, enabled 
		FROM api_keys 
		WHERE tenant_id = $1 
		ORDER BY created_at DESC
	`, tenantID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch keys"})
	}
	defer rows.Close()

	var keys []fiber.Map
	for rows.Next() {
		var k db.APIKey
		if err := rows.Scan(&k.ID, &k.Name, &k.KeyPrefix, &k.CreatedAt, &k.LastUsed, &k.Enabled); err != nil {
			continue
		}
		keys = append(keys, fiber.Map{
			"id":         k.ID,
			"name":       k.Name,
			"prefix":     k.KeyPrefix,
			"created_at": k.CreatedAt,
			"last_used":  k.LastUsed,
			"enabled":    k.Enabled,
		})
	}

	return c.JSON(keys)
}

// CreateAPIKey generates a new API key
func CreateAPIKey(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenantID, _ := uuid.Parse(c.Locals("tenant_id").(string))
		userID, _ := uuid.Parse(c.Locals("user_id").(string))

		var req struct {
			Name string `json:"name"`
		}
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}

		// Generate Key (gk_ + 32 random chars)
		bytes := make([]byte, 16)
		rand.Read(bytes)
		rawKey := "gk_" + hex.EncodeToString(bytes)

		// Create DB Entry
		apiKey := db.APIKey{
			ID:        uuid.New(),
			TenantID:  tenantID,
			Name:      req.Name,
			KeyPrefix: rawKey[:7] + "...", // Store simplified prefix for display
			KeyHash:   rawKey,             // In real prod, this should be bcrypt hashed! keeping raw for MVP/Dev ease
			Enabled:   true,
			CreatedAt: time.Now(),
			CreatedBy: &userID,
		}

		_, err := db.DB.Exec(`
			INSERT INTO api_keys (id, tenant_id, name, key_prefix, key_hash, enabled, created_at, created_by)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`, apiKey.ID, apiKey.TenantID, apiKey.Name, apiKey.KeyPrefix, apiKey.KeyHash, apiKey.Enabled, apiKey.CreatedAt, apiKey.CreatedBy)

		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create key"})
		}

		// Sync to Redis for AuthMiddleware
		// Note: We are constructing the JSON manually to match what main.AuthMiddleware expects
		// Ideally we should share the struct definition
		redisKey := "apikey:" + rawKey
		redisData := map[string]interface{}{
			"key":        rawKey,
			"name":       apiKey.Name,
			"created_at": apiKey.CreatedAt,
			"enabled":    apiKey.Enabled,
			"owner_id":   tenantID.String(), // AuthMiddleware uses this as tenant_id
		}

		val, _ := json.Marshal(redisData)
		rdb.Set(context.Background(), redisKey, val, 0)

		// Return the FULL key only once
		return c.Status(201).JSON(fiber.Map{
			"key":    rawKey,
			"id":     apiKey.ID,
			"name":   apiKey.Name,
			"prefix": apiKey.KeyPrefix,
		})
	}
}

// RevokeAPIKey deletes an API key
func RevokeAPIKey(c *fiber.Ctx) error {
	tenantID, _ := uuid.Parse(c.Locals("tenant_id").(string))
	keyID := c.Params("id")

	result, err := db.DB.Exec("DELETE FROM api_keys WHERE id = $1 AND tenant_id = $2", keyID, tenantID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to revoke key"})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Key not found"})
	}

	return c.SendStatus(204)
}

// GetAuditLogs returns recent audit logs with pagination and filtering
func GetAuditLogs(c *fiber.Ctx) error {
	tenantID, _ := uuid.Parse(c.Locals("tenant_id").(string))

	// Pagination
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 50)
	offset := (page - 1) * limit

	// Filtering
	eventType := c.Query("type")

	query := `
		SELECT id, event_type, event_data, created_at, ip_address 
		FROM audit_logs 
		WHERE tenant_id = $1
	`
	args := []interface{}{tenantID}
	argIdx := 2

	if eventType != "" {
		query += fmt.Sprintf(" AND event_type = $%d", argIdx)
		args = append(args, eventType)
		argIdx++
	}

	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch logs: " + err.Error()})
	}
	defer rows.Close()

	var logs []db.AuditLog
	for rows.Next() {
		var l db.AuditLog
		// Note: We need to handle JSONB scanning properly if strict type scanning fails
		// But assuming db driver handles JSONB -> JSONBMap (map[string]interface{})
		if err := rows.Scan(&l.ID, &l.EventType, &l.EventData, &l.CreatedAt, &l.IPAddress); err != nil {
			continue // Skip malformed rows
		}
		logs = append(logs, l)
	}

	return c.JSON(fiber.Map{
		"data":  logs,
		"page":  page,
		"limit": limit,
	})
}
