package services

import (
	"log"
	"time"

	"zaps/db"

	"github.com/google/uuid"
)

// LogRequestUsage logs a request to the hourly usage_logs table
// It handles the "upsert" logic (insert or increment)
func LogRequestUsage(tenantID string, latencyMs int64, isError bool, tokenCount int) {
	go func() {
		// Parse Tenant ID
		tID, err := uuid.Parse(tenantID)
		if err != nil {
			log.Printf("❌ Usage Log Error: Invalid Tenant ID %s", tenantID)
			return
		}

		// Calculate hour bucket (truncate to hour)
		hourBucket := time.Now().Truncate(time.Hour)

		// Upsert into usage_logs
		// We use ON CONFLICT to increment values if the row exists
		query := `
			INSERT INTO usage_logs (
				tenant_id, 
				hour_bucket, 
				request_count, 
				error_count, 
				avg_latency_ms,
				total_tokens_processed
			)
			VALUES ($1, $2, 1, $3, $4, $5)
			ON CONFLICT (tenant_id, api_key_id, hour_bucket) 
			WHERE api_key_id IS NULL -- We handle the NULL api_key_id case here (common bucket)
			DO UPDATE SET
				request_count = usage_logs.request_count + 1,
				error_count = usage_logs.error_count + EXCLUDED.error_count,
				total_tokens_processed = usage_logs.total_tokens_processed + EXCLUDED.total_tokens_processed,
				-- Simple moving average approximation for latency? Or just sum and divide later?
				-- Schema says "avg_latency_ms INTEGER". 
				-- To keep it simple, let's just update it to the latest for now, 
				-- OR better yet, let's change schema to store 'total_latency' and calc avg on read.
				-- For now, let's just set avg_latency to specific value to avoid complexity, or weighted avg.
				-- Weighted avg: (old_avg * old_count + new_val) / new_count
				avg_latency_ms = (usage_logs.avg_latency_ms * usage_logs.request_count + EXCLUDED.avg_latency_ms) / (usage_logs.request_count + 1)
		`

		// Error count is 1 if isError, else 0
		errCount := 0
		if isError {
			errCount = 1
		}

		// Note: We are assuming api_key_id is NULL for now as we don't strictly track it in proxy yet
		_, err = db.DB.Exec(query, tID, hourBucket, errCount, latencyMs, tokenCount)

		if err != nil {
			log.Printf("❌ Failed to log usage stats: %v", err)
		}
	}()
}
