package api

import (
	"database/sql"
	"time"

	"zaps/db"
	"zaps/services"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// Generate2FA generates a new 2FA secret for the user
func Generate2FA(c *fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)
	userID, _ := uuid.Parse(userIDStr)

	// Get user email
	var email string
	err := db.DB.QueryRow("SELECT email FROM users WHERE id = $1", userID).Scan(&email)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch user"})
	}

	secret, url, err := services.GenerateTOTP(email)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to generate 2FA secret"})
	}

	return c.JSON(fiber.Map{
		"secret":  secret,
		"qr_code": url,
	})
}

// Enable2FA validates the code and enables 2FA for the user
func Enable2FA(c *fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)
	userID, _ := uuid.Parse(userIDStr)

	var req struct {
		Secret string `json:"secret"`
		Code   string `json:"code"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	// Validate code
	if !services.ValidateTOTP(req.Code, req.Secret) {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid verification code"})
	}

	// Enable in DB
	_, err := db.DB.Exec("UPDATE users SET two_factor_enabled = TRUE, two_factor_secret = $1, updated_at = $2 WHERE id = $3",
		req.Secret, time.Now(), userID)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to enable 2FA"})
	}

	return c.JSON(fiber.Map{"message": "Two-factor authentication enabled successfully"})
}

// Disable2FA disables 2FA for the user
func Disable2FA(c *fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)
	userID, _ := uuid.Parse(userIDStr)

	// In a real app, we might require the password again before disabling

	_, err := db.DB.Exec("UPDATE users SET two_factor_enabled = FALSE, two_factor_secret = NULL, updated_at = $1 WHERE id = $2",
		time.Now(), userID)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to disable 2FA"})
	}

	return c.JSON(fiber.Map{"message": "Two-factor authentication disabled"})
}

// GetSecurityStatus returns the current 2FA status
func GetSecurityStatus(c *fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)
	userID, _ := uuid.Parse(userIDStr)

	var enabled bool
	err := db.DB.QueryRow("SELECT two_factor_enabled FROM users WHERE id = $1", userID).Scan(&enabled)
	if err == sql.ErrNoRows {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	return c.JSON(fiber.Map{"two_factor_enabled": enabled})
}
