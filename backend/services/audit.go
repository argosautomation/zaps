package services

import (
	"encoding/json"
	"log"
	"strings"

	"zaps/db"

	"github.com/google/uuid"
)

// LogAuditAsync inserts an audit log entry asynchronously
func LogAuditAsync(tenantID string, userID *string, eventType string, eventData map[string]interface{}, ip string, userAgent string) {
	// Sanitize IP (handle X-Forwarded-For multiple IPs)
	if strings.Contains(ip, ",") {
		ip = strings.TrimSpace(strings.Split(ip, ",")[0])
	}
	go func() {
		// Parse UUIDs
		tID, err := uuid.Parse(tenantID)
		if err != nil {
			// Silently fail or log to standard logger if available
			// log.Printf("❌ Audit Log Error: Invalid Tenant ID %s", tenantID)
			return
		}

		var uID *uuid.UUID
		if userID != nil {
			if id, err := uuid.Parse(*userID); err == nil {
				uID = &id
			}
		}

		// Handle empty IP for INET column
		var ipPtr *string
		if ip != "" {
			ipPtr = &ip
		}

		// Convert Map to JSONB
		// In Go, db.JSONBMap is map[string]interface{}
		// We ensure eventData is safe

		// Marshal eventData to JSON
		jsonData, err := json.Marshal(eventData)
		if err != nil {
			return
		}

		_, err = db.DB.Exec(`
			INSERT INTO audit_logs (tenant_id, user_id, event_type, event_data, ip_address, user_agent)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, tID, uID, eventType, jsonData, ipPtr, userAgent)

		if err != nil {
			// In production, we might want to log this to a file
			log.Printf("❌ Saved Audit Log Failed: %v", err)
		}
	}()
}
