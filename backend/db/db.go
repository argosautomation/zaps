package db

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
)

var DB *sql.DB

// InitDB initializes the PostgreSQL connection
func InitDB() error {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		// Construct from individual params (AWS Copilot)
		host := os.Getenv("DB_HOST")
		if host == "" {
			host = os.Getenv("DBHOST") // Copilot addon output
		}
		port := os.Getenv("DB_PORT")
		if port == "" {
			port = os.Getenv("DBPORT")
		}
		user := os.Getenv("DB_USER")
		if user == "" {
			user = os.Getenv("DBUSER")
		}
		password := os.Getenv("DB_PASSWORD")
		if password == "" {
			password = os.Getenv("DBPASSWORD")
		}
		dbname := os.Getenv("DB_NAME")
		if dbname == "" {
			dbname = "zaps"
		}

		if host != "" && port != "" {
			connStr = fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=require", user, password, host, port, dbname)
		}
	}

	if connStr == "" {
		return fmt.Errorf("DATABASE_URL environment variable not set")
	}

	var err error
	DB, err = sql.Open("postgres", connStr)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err = DB.PingContext(ctx); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	// Connection pool settings
	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(5)
	DB.SetConnMaxLifetime(5 * time.Minute)
	DB.SetConnMaxIdleTime(2 * time.Minute)

	log.Println("✓ Connected to PostgreSQL")
	return nil
}

// CloseDB closes the database connection
func CloseDB() {
	if DB != nil {
		DB.Close()
		log.Println("✓ Database connection closed")
	}
}

// HealthCheck verifies database connectivity
func HealthCheck() error {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	return DB.PingContext(ctx)
}
