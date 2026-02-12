package main

import (
	"fmt"
	"log"
	"os"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load("../../.env")

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		host := os.Getenv("DB_HOST")
		port := os.Getenv("DB_PORT")
		user := os.Getenv("DB_USER")
		password := os.Getenv("DB_PASSWORD")
		dbname := os.Getenv("DB_NAME")

		if host != "" && port != "" {
			databaseURL = fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=require", user, password, host, port, dbname)
		}
	}

	if databaseURL == "" {
		log.Fatal("DATABASE_URL is not set and could not be constructed from DB_* vars")
	}

	// Try paths: Prod (/db/migrations) vs Dev (../../db/migrations)
	sourceURL := "file:///db/migrations"
	if _, err := os.Stat("/db/migrations"); os.IsNotExist(err) {
		sourceURL = "file://../../db/migrations"
	}

	log.Printf("Running migrations from %s", sourceURL)

	m, err := migrate.New(
		sourceURL,
		databaseURL,
	)
	if err != nil {
		log.Fatal(err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		log.Fatal(err)
	}

	log.Println("Migrations applied successfully!")
}
