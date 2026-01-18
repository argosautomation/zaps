package main

import (
	"context"
	"fmt"
	"os"
	"text/tabwriter"
	"time"

	"github.com/redis/go-redis/v9"
)

// CLI tool for managing API keys
func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	// Connect to Redis
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "localhost:6379"
	}

	rdb := redis.NewClient(&redis.Options{
		Addr: redisURL,
	})

	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		fmt.Printf("❌ Error: Cannot connect to Redis at %s\n", redisURL)
		fmt.Printf("   Make sure Redis is running or set REDIS_URL environment variable\n")
		os.Exit(1)
	}

	command := os.Args[1]

	switch command {
	case "create":
		handleCreate(rdb)
	case "list":
		handleList(rdb)
	case "disable":
		handleDisable(rdb)
	case "enable":
		handleEnable(rdb)
	case "delete":
		handleDelete(rdb)
	case "rotate":
		handleRotate(rdb)
	case "info":
		handleInfo(rdb)
	default:
		fmt.Printf("❌ Unknown command: %s\n\n", command)
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println("╔═══════════════════════════════════════════════════════════╗")
	fmt.Println("║          Zaps.ai Gateway - API Key Manager               ║")
	fmt.Println("╚═══════════════════════════════════════════════════════════╝")
	fmt.Println()
	fmt.Println("Usage: keymgr <command> [arguments]")
	fmt.Println()
	fmt.Println("Commands:")
	fmt.Println("  create <name> <description>   Create a new API key")
	fmt.Println("  list                          List all API keys")
	fmt.Println("  info <key>                    Show detailed key information")
	fmt.Println("  disable <key>                 Disable an API key")
	fmt.Println("  enable <key>                  Enable an API key")
	fmt.Println("  delete <key>                  Delete an API key permanently")
	fmt.Println("  rotate <old-key> <new-name>   Rotate key (delete old, create new)")
	fmt.Println()
	fmt.Println("Examples:")
	fmt.Println("  keymgr create glass-desk \"Glass Desk Application\"")
	fmt.Println("  keymgr list")
	fmt.Println("  keymgr info gk_abc123...")
	fmt.Println("  keymgr disable gk_abc123...")
	fmt.Println()
}

func handleCreate(rdb *redis.Client) {
	if len(os.Args) < 4 {
		fmt.Println("❌ Usage: keymgr create <name> <description>")
		os.Exit(1)
	}

	name := os.Args[2]
	description := os.Args[3]

	key, err := GenerateAPIKey()
	if err != nil {
		fmt.Printf("❌ Error generating key: %v\n", err)
		os.Exit(1)
	}

	apiKey := &APIKey{
		Key:         key,
		Name:        name,
		Description: description,
		CreatedAt:   time.Now(),
		UsageCount:  0,
		RateLimit:   100, // default: 100 req/min
		Enabled:     true,
	}

	if err := StoreAPIKey(rdb, apiKey); err != nil {
		fmt.Printf("❌ Error storing key: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("✅ API Key created successfully!")
	fmt.Println()
	fmt.Printf("Name:        %s\n", name)
	fmt.Printf("Description: %s\n", description)
	fmt.Printf("API Key:     %s\n", key)
	fmt.Println()
	fmt.Println("⚠️  IMPORTANT: Save this key now! It won't be shown again.")
	fmt.Println()
	fmt.Println("Usage in API calls:")
	fmt.Printf("  curl -H \"Authorization: Bearer %s\" https://zaps.ai/v1/chat/completions\n", key)
	fmt.Println()
}

func handleList(rdb *redis.Client) {
	keys, err := ListAPIKeys(rdb)
	if err != nil {
		fmt.Printf("❌ Error listing keys: %v\n", err)
		os.Exit(1)
	}

	if len(keys) == 0 {
		fmt.Println("No API keys found.")
		fmt.Println()
		fmt.Println("Create one with: keymgr create <name> <description>")
		return
	}

	fmt.Printf("Found %d API key(s):\n\n", len(keys))

	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintln(w, "NAME\tKEY\tSTATUS\tUSAGE\tLAST USED\tCREATED")
	fmt.Fprintln(w, "────\t───\t──────\t─────\t─────────\t───────")

	for _, key := range keys {
		status := "✅ Active"
		if !key.Enabled {
			status = "❌ Disabled"
		}

		lastUsed := "Never"
		if !key.LastUsedAt.IsZero() {
			lastUsed = formatTime(key.LastUsedAt)
		}

		maskedKey := maskKey(key.Key)
		created := formatTime(key.CreatedAt)

		fmt.Fprintf(w, "%s\t%s\t%s\t%d\t%s\t%s\n",
			key.Name, maskedKey, status, key.UsageCount, lastUsed, created)
	}

	w.Flush()
	fmt.Println()
}

func handleInfo(rdb *redis.Client) {
	if len(os.Args) < 3 {
		fmt.Println("❌ Usage: keymgr info <key>")
		os.Exit(1)
	}

	keyStr := os.Args[2]
	apiKey, err := GetAPIKey(rdb, keyStr)
	if err != nil {
		fmt.Printf("❌ API key not found: %s\n", keyStr)
		os.Exit(1)
	}

	fmt.Println("API Key Information:")
	fmt.Println("══════════════════════════════════════════")
	fmt.Printf("Name:         %s\n", apiKey.Name)
	fmt.Printf("Description:  %s\n", apiKey.Description)
	fmt.Printf("Key:          %s\n", maskKey(apiKey.Key))
	fmt.Printf("Status:       %s\n", statusStr(apiKey.Enabled))
	fmt.Printf("Created:      %s\n", apiKey.CreatedAt.Format(time.RFC1123))
	fmt.Printf("Last Used:    %s\n", formatLastUsed(apiKey.LastUsedAt))
	fmt.Printf("Usage Count:  %d requests\n", apiKey.UsageCount)
	fmt.Printf("Rate Limit:   %d req/min\n", apiKey.RateLimit)
	fmt.Println()
}

func handleDisable(rdb *redis.Client) {
	if len(os.Args) < 3 {
		fmt.Println("❌ Usage: keymgr disable <key>")
		os.Exit(1)
	}

	keyStr := os.Args[2]
	apiKey, err := GetAPIKey(rdb, keyStr)
	if err != nil {
		fmt.Printf("❌ API key not found: %s\n", keyStr)
		os.Exit(1)
	}

	apiKey.Enabled = false
	if err := StoreAPIKey(rdb, apiKey); err != nil {
		fmt.Printf("❌ Error disabling key: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("✅ API key disabled: %s (%s)\n", apiKey.Name, maskKey(keyStr))
}

func handleEnable(rdb *redis.Client) {
	if len(os.Args) < 3 {
		fmt.Println("❌ Usage: keymgr enable <key>")
		os.Exit(1)
	}

	keyStr := os.Args[2]
	apiKey, err := GetAPIKey(rdb, keyStr)
	if err != nil {
		fmt.Printf("❌ API key not found: %s\n", keyStr)
		os.Exit(1)
	}

	apiKey.Enabled = true
	if err := StoreAPIKey(rdb, apiKey); err != nil {
		fmt.Printf("❌ Error enabling key: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("✅ API key enabled: %s (%s)\n", apiKey.Name, maskKey(keyStr))
}

func handleDelete(rdb *redis.Client) {
	if len(os.Args) < 3 {
		fmt.Println("❌ Usage: keymgr delete <key>")
		os.Exit(1)
	}

	keyStr := os.Args[2]
	apiKey, err := GetAPIKey(rdb, keyStr)
	if err != nil {
		fmt.Printf("❌ API key not found: %s\n", keyStr)
		os.Exit(1)
	}

	if err := DeleteAPIKey(rdb, keyStr); err != nil {
		fmt.Printf("❌ Error deleting key: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("✅ API key deleted: %s (%s)\n", apiKey.Name, maskKey(keyStr))
}

func handleRotate(rdb *redis.Client) {
	if len(os.Args) < 4 {
		fmt.Println("❌ Usage: keymgr rotate <old-key> <new-name>")
		os.Exit(1)
	}

	oldKey := os.Args[2]
	newName := os.Args[3]

	// Get old key info
	oldAPIKey, err := GetAPIKey(rdb, oldKey)
	if err != nil {
		fmt.Printf("❌ Old API key not found: %s\n", oldKey)
		os.Exit(1)
	}

	// Generate new key
	newKey, err := GenerateAPIKey()
	if err != nil {
		fmt.Printf("❌ Error generating new key: %v\n", err)
		os.Exit(1)
	}

	// Create new API key with same settings
	newAPIKey := &APIKey{
		Key:         newKey,
		Name:        newName,
		Description: fmt.Sprintf("Rotated from %s", oldAPIKey.Name),
		CreatedAt:   time.Now(),
		UsageCount:  0,
		RateLimit:   oldAPIKey.RateLimit,
		Enabled:     true,
	}

	if err := StoreAPIKey(rdb, newAPIKey); err != nil {
		fmt.Printf("❌ Error storing new key: %v\n", err)
		os.Exit(1)
	}

	// Delete old key
	if err := DeleteAPIKey(rdb, oldKey); err != nil {
		fmt.Printf("❌ Error deleting old key: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("✅ API Key rotated successfully!")
	fmt.Println()
	fmt.Printf("Old Key:  %s (deleted)\n", maskKey(oldKey))
	fmt.Printf("New Key:  %s\n", newKey)
	fmt.Printf("Name:     %s\n", newName)
	fmt.Println()
	fmt.Println("⚠️  Update your application to use the new key:")
	fmt.Printf("  Authorization: Bearer %s\n", newKey)
	fmt.Println()
}

// Helper functions
func maskKey(key string) string {
	if len(key) <= 12 {
		return "***"
	}
	return key[:7] + "..." + key[len(key)-4:]
}

func statusStr(enabled bool) string {
	if enabled {
		return "✅ Active"
	}
	return "❌ Disabled"
}

func formatTime(t time.Time) string {
	duration := time.Since(t)
	if duration < time.Minute {
		return "Just now"
	}
	if duration < time.Hour {
		return fmt.Sprintf("%dm ago", int(duration.Minutes()))
	}
	if duration < 24*time.Hour {
		return fmt.Sprintf("%dh ago", int(duration.Hours()))
	}
	return fmt.Sprintf("%dd ago", int(duration.Hours()/24))
}

func formatLastUsed(t time.Time) string {
	if t.IsZero() {
		return "Never"
	}
	return formatTime(t)
}
