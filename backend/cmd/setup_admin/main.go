package main

import (
	"log"
	"zaps/db"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("Warning: .env file not found")
	}

	db.InitDB()

	log.Printf("Promoting ALL users to Super Admin (Dev Mode)...")

	res, err := db.DB.Exec("UPDATE users SET is_super_admin = TRUE")
	if err != nil {
		log.Fatalf("Update failed: %v", err)
	}

	rows, _ := res.RowsAffected()
	log.Printf("Success! %d user(s) promoted.", rows)
}
