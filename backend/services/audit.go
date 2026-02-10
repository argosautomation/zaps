package services

import (
	"encoding/json"
	"log"

	"zaps/db"

	"github.com/google/uuid"
)

// LogAuditAsync inserts an audit log entry asynchronously
func LogAuditAsync(tenantID string, userID *string, eventType string, eventData map[string]interface{}, ip string, userAgent string) {
	go func() {
		// Parse UUIDs
		tID, err := uuid.Parse(tenantID)
		if err != nil {
			log.Printf("❌ Audit Log Error: Invalid Tenant ID %s", tenantID)
			return
		}

		var uID *uuid.UUID
		if userID != nil {
			if id, err := uuid.Parse(*userID); err == nil {
				uID = &id
			}
		}

		// Convert Map to JSONB
		// In Go, db.JSONBMap is map[string]interface{}
		// We ensure eventData is safe

		// Marshal eventData to JSON
		jsonData, err := json.Marshal(eventData)
		if err != nil {
			log.Printf("❌ Failed to marshal audit log data: %v", err)
			return
		}

		_, err = db.DB.Exec(`
			INSERT INTO audit_logs (tenant_id, user_id, event_type, event_data, ip_address, user_agent)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, tID, uID, eventType, jsonData, ip, userAgent)

		if err != nil {
			log.Printf("❌ Saved Audit Log Failed: %v", err)
		}
	}()
}
