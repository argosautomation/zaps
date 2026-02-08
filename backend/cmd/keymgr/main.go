package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
)

var ctx = context.Background()

func main() {
	// Load .env from root if possible
	if err := godotenv.Load("../../.env"); err != nil {
		// Try current dir
		godotenv.Load()
	}

	action := flag.String("action", "list", "Action: list, generate, revoke")
	userID := flag.String("user", "", "User ID (required for generate)")
	provider := flag.String("provider", "", "Provider (required for generate)")
	flag.Parse()

	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "localhost:6379"
	}

	rdb := redis.NewClient(&redis.Options{Addr: redisURL})
	defer rdb.Close()

	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("Redis error: %v", err)
	}

	switch *action {
	case "list":
		// Implementation would go here - placeholder for now to resolve build
		fmt.Println("Listing keys not fully implemented in CLI yet")
	case "generate":
		if *userID == "" || *provider == "" {
			log.Fatal("User ID and Provider required")
		}
		// Implementation placeholder
		fmt.Println("Generating key...")
	default:
		fmt.Println("Unknown action")
	}
}
