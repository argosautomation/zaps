package services

import (
	"crypto/sha1"
	"fmt"
	"io"
	"net/http"
	"strings"
	"unicode"
)

// ValidatePassword checks if the password meets complexity requirements and
// verifies it against the "Have I Been Pwned" database.
func ValidatePassword(password string) error {
	// 1. Complexity Check
	if len(password) < 12 {
		return fmt.Errorf("Password must be at least 12 characters long")
	}

	var (
		hasUpper  bool
		hasLower  bool
		hasNumber bool
		// hasSpecial bool // Optional, but user asked for it in prompt "special characters... but...".
		// Actually user said "I'm not a fan of special characters but can we require long passwords, uppercase, lowercase, and a number."
		// So we will NOT strictly require special chars, but enforce the others.
	)

	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsNumber(char):
			hasNumber = true
		}
	}

	if !hasUpper || !hasLower || !hasNumber {
		return fmt.Errorf("Password must contain at least one uppercase letter, one lowercase letter, and one number")
	}

	// 2. HIBP Check (Pwned Passwords)
	if isPwned(password) {
		return fmt.Errorf("This password has been exposed in a data breach. Please choose a different one.")
	}

	return nil
}

// isPwned checks the password against the HIBP API using k-anonymity
func isPwned(password string) bool {
	// Hash password with SHA-1
	h := sha1.New()
	io.WriteString(h, password)
	hash := fmt.Sprintf("%X", h.Sum(nil))

	prefix := hash[:5]
	suffix := hash[5:]

	// Query API
	resp, err := http.Get("https://api.pwnedpasswords.com/range/" + prefix)
	if err != nil {
		// If API fails, default to safe (allow password) rather than blocking user
		// Log the error in a real app
		fmt.Printf("⚠️ HIBP API check failed: %v\n", err)
		return false
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false
	}

	// Check if suffix exists in response
	// Response format: SUFFIX:COUNT
	entries := strings.Split(string(body), "\n")
	for _, entry := range entries {
		parts := strings.Split(strings.TrimSpace(entry), ":")
		if len(parts) >= 1 && parts[0] == suffix {
			return true // Password found
		}
	}

	return false
}
