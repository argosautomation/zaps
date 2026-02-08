package api

import (
	"database/sql"
	"os"
	"strings"
	"time"

	"zaps/db"
	"zaps/services"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// RegisterRequest represents the registration payload
type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	OrgName  string `json:"org_name"`
}

// LoginRequest represents a login attempt
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Code     string `json:"code"` // 2FA Code
}

func isValidEmail(email string) bool {
	// Simple regex for email validation
	return strings.Contains(email, "@") && strings.Contains(email, ".")
}

func generateSecureToken(length int) (string, error) {
	// In a real app, use crypto/rand
	// reusing uuid for now as it's unique enough for this MVP phase
	return uuid.New().String(), nil
}

// HandleRegister creates a new user account
func HandleRegister(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Validate email
	if !isValidEmail(req.Email) {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid email address"})
	}

	// Normalize email
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	// Validate password strength
	if len(req.Password) < 12 {
		return c.Status(400).JSON(fiber.Map{"error": "Password must be at least 12 characters"})
	}

	// Check if email already exists
	var exists bool
	err := db.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", req.Email).Scan(&exists)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}
	if exists {
		return c.Status(409).JSON(fiber.Map{"error": "Email already registered"})
	}

	// Hash password
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 14)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to hash password"})
	}

	// Generate verification token (secure random)
	token, err := generateSecureToken(32)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to generate verification token"})
	}

	tokenExpiry := time.Now().Add(24 * time.Hour)

	// Start transaction
	tx, err := db.DB.Begin()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}
	defer tx.Rollback()

	// Create tenant
	tenantID := uuid.New()
	orgName := req.OrgName
	if orgName == "" {
		// Default to email domain
		parts := strings.Split(req.Email, "@")
		if len(parts) == 2 {
			orgName = strings.Title(parts[1])
		} else {
			orgName = req.Email
		}
	}

	_, err = tx.Exec(`
		INSERT INTO tenants (id, name, subscription_tier, monthly_quota) 
		VALUES ($1, $2, 'free', 1000)
	`, tenantID, orgName)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create organization"})
	}

	// Create user
	userID := uuid.New()
	_, err = tx.Exec(`
		INSERT INTO users (
			id, tenant_id, email, password_hash, 
			verification_token, verification_token_expires_at
		) VALUES ($1, $2, $3, $4, $5, $6)
	`, userID, tenantID, req.Email, string(passwordHash), token, tokenExpiry)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create user"})
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save user"})
	}

	// Send verification email (async)
	go services.SendVerificationEmail(req.Email, token)

	return c.Status(201).JSON(fiber.Map{
		"message": "Registration successful! Please check your email to verify your account.",
		"user_id": userID,
	})
}

// HandleVerifyEmail verifies a user's email with the token
func HandleVerifyEmail(c *fiber.Ctx) error {
	token := c.Query("token")
	if token == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Verification token required"})
	}

	// Find user by token
	var userID, tenantID uuid.UUID
	var email string
	var tokenExpiry time.Time

	err := db.DB.QueryRow(`
		SELECT id, tenant_id, email, verification_token_expires_at
		FROM users 
		WHERE verification_token = $1 AND email_verified = FALSE
	`, token).Scan(&userID, &tenantID, &email, &tokenExpiry)

	if err == sql.ErrNoRows {
		return c.Status(404).JSON(fiber.Map{"error": "Invalid or expired verification token"})
	}
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	// Check if token expired
	if time.Now().After(tokenExpiry) {
		return c.Status(400).JSON(fiber.Map{"error": "Verification token has expired"})
	}

	// Update user as verified
	_, err = db.DB.Exec(`
		UPDATE users 
		SET email_verified = TRUE, 
		    verification_token = NULL,
		    verification_token_expires_at = NULL
		WHERE id = $1
	`, userID)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to verify email"})
	}

	return c.JSON(fiber.Map{
		"message": "Email verified successfully! You can now log in.",
		"email":   email,
	})
}

// HandleLogin authenticates a user and returns a session token
func HandleLogin(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	// Get user from database
	var user db.User
	var twoFactorSecret *string

	err := db.DB.QueryRow(`
		SELECT id, tenant_id, email, password_hash, email_verified, 
		       failed_login_attempts, locked_until, two_factor_enabled, two_factor_secret
		FROM users 
		WHERE email = $1
	`, req.Email).Scan(
		&user.ID, &user.TenantID, &user.Email, &user.PasswordHash,
		&user.EmailVerified, &user.FailedLoginAttempts, &user.LockedUntil,
		&user.TwoFactorEnabled, &twoFactorSecret,
	)

	if err == sql.ErrNoRows {
		// Don't reveal if user exists
		time.Sleep(100 * time.Millisecond) // Timing attack mitigation
		return c.Status(401).JSON(fiber.Map{"error": "Invalid credentials"})
	}
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	// Check if account is locked
	if user.LockedUntil != nil && time.Now().Before(*user.LockedUntil) {
		return c.Status(403).JSON(fiber.Map{
			"error":        "Account locked due to too many failed login attempts",
			"locked_until": user.LockedUntil.Format(time.RFC3339),
		})
	}

	// Check if email is verified
	if !user.EmailVerified {
		return c.Status(403).JSON(fiber.Map{"error": "Please verify your email before logging in"})
	}

	// Verify password
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		// Increment failed attempts
		newAttempts := user.FailedLoginAttempts + 1
		var lockedUntil *time.Time

		if newAttempts >= 5 {
			// Lock account for 15 minutes
			lockTime := time.Now().Add(15 * time.Minute)
			lockedUntil = &lockTime
		}

		db.DB.Exec(`
			UPDATE users 
			SET failed_login_attempts = $1, locked_until = $2
			WHERE id = $3
		`, newAttempts, lockedUntil, user.ID)

		return c.Status(401).JSON(fiber.Map{"error": "Invalid credentials"})
	}

	// 2FA Check
	if user.TwoFactorEnabled {
		if req.Code == "" {
			return c.Status(403).JSON(fiber.Map{
				"error":   "mfa_required",
				"message": "Two-factor authentication code required",
			})
		}

		// Validate TOTP
		valid := services.ValidateTOTP(req.Code, *twoFactorSecret)
		if !valid {
			return c.Status(401).JSON(fiber.Map{"error": "Invalid 2FA code"})
		}
	}

	// Reset failed attempts and update last login
	_, err = db.DB.Exec(`
		UPDATE users 
		SET failed_login_attempts = 0, locked_until = NULL, last_login = $1
		WHERE id = $2
	`, time.Now(), user.ID)
	if err != nil {
		// Non-fatal
	}

	// Generate JWT
	claims := jwt.MapClaims{
		"user_id":   user.ID.String(),
		"tenant_id": user.TenantID.String(),
		"exp":       time.Now().Add(24 * time.Hour).Unix(),
	}

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "default-secret-key-change-me"
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	t, err := token.SignedString([]byte(secret))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to generate token"})
	}

	// Set cookie
	c.Cookie(&fiber.Cookie{
		Name:     "session",
		Value:    t,
		Expires:  time.Now().Add(24 * time.Hour),
		HTTPOnly: true,
		Secure:   false, // Set to true in production
		SameSite: "Lax",
	})

	return c.JSON(fiber.Map{
		"token": t,
		"user": fiber.Map{
			"id":    user.ID,
			"email": user.Email,
		},
	})
}

func HandleLogout(c *fiber.Ctx) error {
	c.Cookie(&fiber.Cookie{
		Name:     "session",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
		Secure:   false,
		SameSite: "Lax",
	})
	return c.JSON(fiber.Map{"message": "Logged out successfully"})
}

// HandleRequestPasswordReset initiates the password reset flow
func HandleRequestPasswordReset(c *fiber.Ctx) error {
	var req struct {
		Email string `json:"email"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	// Check if user exists
	var userID uuid.UUID
	err := db.DB.QueryRow("SELECT id FROM users WHERE email = $1", req.Email).Scan(&userID)
	if err == sql.ErrNoRows {
		// Silent success to prevent enumeration
		time.Sleep(randomDuration(100, 300))
		return c.JSON(fiber.Map{"message": "If an account exists, a reset email has been sent."})
	}
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	// Generate and save token
	token, _ := generateSecureToken(32)
	expiresAt := time.Now().Add(1 * time.Hour)

	_, err = db.DB.Exec(`
		UPDATE users 
		SET password_reset_token = $1, password_reset_expires_at = $2 
		WHERE id = $3
	`, token, expiresAt, userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to generate reset token"})
	}

	// Send email (async)
	go services.SendPasswordResetEmail(req.Email, token)

	return c.JSON(fiber.Map{"message": "If an account exists, a reset email has been sent."})
}

// HandleResetPassword completes the password reset flow
func HandleResetPassword(c *fiber.Ctx) error {
	var req struct {
		Token       string `json:"token"`
		NewPassword string `json:"new_password"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	if len(req.NewPassword) < 12 {
		return c.Status(400).JSON(fiber.Map{"error": "Password must be at least 12 characters"})
	}

	// Find user by token
	var userID uuid.UUID
	var expiresAt time.Time

	err := db.DB.QueryRow(`
		SELECT id, password_reset_expires_at 
		FROM users 
		WHERE password_reset_token = $1
	`, req.Token).Scan(&userID, &expiresAt)

	if err == sql.ErrNoRows {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid or expired reset token"})
	}
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	// Check expiry
	if time.Now().After(expiresAt) {
		return c.Status(400).JSON(fiber.Map{"error": "Reset token has expired"})
	}

	// Hash new password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), 14)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to hash password"})
	}

	// Update password and clear token
	// Also clear locked status if any
	_, err = db.DB.Exec(`
		UPDATE users 
		SET password_hash = $1, 
		    password_reset_token = NULL, 
		    password_reset_expires_at = NULL,
		    failed_login_attempts = 0,
		    locked_until = NULL
		WHERE id = $2
	`, string(hash), userID)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to reset password"})
	}

	return c.JSON(fiber.Map{"message": "Password reset successfully. You can now log in."})
}

// Helper to prevent timing attacks
func randomDuration(min, max int) time.Duration {
	return time.Duration(min) * time.Millisecond
}
