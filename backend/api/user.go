package api

import (
	"database/sql"
	"time"
	"zaps/db"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// GetProfile returns the current authenticated user's profile
func GetProfile(c *fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	var user db.User
	err = db.DB.QueryRow(`
		SELECT id, email, first_name, last_name, created_at, tenant_id 
		FROM users WHERE id = $1`, userID).Scan(
		&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.CreatedAt, &user.TenantID,
	)

	if err == sql.ErrNoRows {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	} else if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	return c.JSON(fiber.Map{
		"id":         user.ID,
		"email":      user.Email,
		"first_name": user.FirstName,
		"last_name":  user.LastName,
		"created_at": user.CreatedAt,
	})
}

// UpdateProfile updates the user's personal information
func UpdateProfile(c *fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)

	var req struct {
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	_, err := db.DB.Exec("UPDATE users SET first_name = $1, last_name = $2, updated_at = $3 WHERE id = $4",
		req.FirstName, req.LastName, time.Now(), userIDStr)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update profile"})
	}

	return c.JSON(fiber.Map{"message": "Profile updated successfully"})
}

// GetOrganization returns the current tenant's details
func GetOrganization(c *fiber.Ctx) error {
	tenantIDStr := c.Locals("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid tenant ID"})
	}

	var tenant db.Tenant
	err = db.DB.QueryRow(`
		SELECT id, name, subscription_tier, monthly_quota, current_usage, quota_reset_at 
		FROM tenants WHERE id = $1`, tenantID).Scan(
		&tenant.ID, &tenant.Name, &tenant.SubscriptionTier, &tenant.MonthlyQuota, &tenant.CurrentUsage, &tenant.QuotaResetAt,
	)

	if err == sql.ErrNoRows {
		return c.Status(404).JSON(fiber.Map{"error": "Organization not found"})
	} else if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	return c.JSON(fiber.Map{
		"id":             tenant.ID,
		"name":           tenant.Name,
		"subscription":   tenant.SubscriptionTier,
		"monthly_quota":  tenant.MonthlyQuota,
		"current_usage":  tenant.CurrentUsage,
		"quota_reset_at": tenant.QuotaResetAt,
	})
}

// UpdateOrganization updates the tenant's name
func UpdateOrganization(c *fiber.Ctx) error {
	tenantIDStr := c.Locals("tenant_id").(string)

	var req struct {
		Name string `json:"name"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Name == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Organization name cannot be empty"})
	}

	_, err := db.DB.Exec("UPDATE tenants SET name = $1, updated_at = $2 WHERE id = $3",
		req.Name, time.Now(), tenantIDStr)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update organization"})
	}

	return c.JSON(fiber.Map{"message": "Organization updated successfully"})
}

// ChangePassword allows the user to update their password
func ChangePassword(c *fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)

	var req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// 1. Verify current password
	var passwordHash string
	err := db.DB.QueryRow("SELECT password_hash FROM users WHERE id = $1", userIDStr).Scan(&passwordHash)
	if err == sql.ErrNoRows {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.CurrentPassword)); err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "Incorrect current password"})
	}

	// 2. Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to hash password"})
	}

	// 3. Update database
	_, err = db.DB.Exec("UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3",
		string(hashedPassword), time.Now(), userIDStr)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update password"})
	}

	return c.JSON(fiber.Map{"message": "Password changed successfully"})
}

// Admin Helper: CreateUser (for development/admin usage)
func CreateUser(c *fiber.Ctx) error {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		TenantID string `json:"tenant_id"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	hashed, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	id := uuid.New()

	_, err := db.DB.Exec(`
		INSERT INTO users (id, tenant_id, email, password_hash, email_verified, created_at, updated_at, failed_login_attempts)
		VALUES ($1, $2, $3, $4, true, NOW(), NOW(), 0)
	`, id, req.TenantID, req.Email, string(hashed))

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"id": id})
}
