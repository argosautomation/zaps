package main

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"log"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

// Constants
const (
	AdminSessionPrefix = "admin:session:"
	AdminUserPrefix    = "admin:user:"
	AdminWhitelistKey  = "admin:whitelist"
	SessionDuration    = 24 * time.Hour
)

// AdminUser represents a dashboard administrator
type AdminUser struct {
	Username     string    `json:"username"`
	PasswordHash string    `json:"password_hash"`
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
}

// LoginRequest for incoming JSON payload
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// InitAdmin ensures default settings and user exist
func InitAdmin(rdb *redis.Client) {
	ctx := context.Background()

	// 1. Ensure Default Whitelist
	// Check if any whitelist functionality is enabled/needed.
	// The requirement is specific: "restrict access to the admin place to IP address 68.58.169.45"
	// We use a Hash to store IP -> Label
	count, err := rdb.HLen(ctx, AdminWhitelistKey).Result()
	if err != nil || count == 0 {
		rdb.HSet(ctx, AdminWhitelistKey, "68.58.169.45", "Phi's IP")
		rdb.HSet(ctx, AdminWhitelistKey, "127.0.0.1", "Localhost") // Often needed for internal health checks if on same net
		log.Println("Admin: Initialized whitelist with 68.58.169.45")
	}

	// 2. Ensure Default User
	defaultUser := "philportman"
	exists, err := rdb.Exists(ctx, AdminUserPrefix+defaultUser).Result()
	if err != nil {
		log.Printf("Admin: Error checking default user: %v", err)
	}

	if exists == 0 {
		// Password: fzFzI0ExsvkCI90qdpOWzMh9C
		hash, _ := HashPassword("fzFzI0ExsvkCI90qdpOWzMh9C")
		user := AdminUser{
			Username:     defaultUser,
			PasswordHash: hash,
			Role:         "superadmin",
		}
		SaveAdminUser(rdb, &user)
		log.Printf("Admin: Created default user '%s'", defaultUser)
	}
}

// --- Middleware ---

// IPWhitelistMiddleware restricts access to allowed IPs
func IPWhitelistMiddleware(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Check headers for real IP (Cloudflare/Caddy/Docker chain)
		// Priority: CF-Connecting-IP > X-Forwarded-For > RemoteIP
		clientIP := c.Get("CF-Connecting-IP")

		if clientIP == "" {
			// X-Forwarded-For can be a comma-separated list: "client, proxy1, proxy2"
			forwarded := c.Get("X-Forwarded-For")
			if forwarded != "" {
				ips := strings.Split(forwarded, ",")
				// The first IP is the true client IP
				clientIP = strings.TrimSpace(ips[0])
			}
		}

		if clientIP == "" {
			clientIP = c.Context().RemoteIP().String()
		}

		// Normalize IPv6 localhost
		if clientIP == "::1" {
			clientIP = "127.0.0.1"
		}

		clientIP = strings.TrimSpace(clientIP)

		// Always allow localhost (Self-checks/Health checks)
		if clientIP == "127.0.0.1" {
			return c.Next()
		}

		// Log for debugging (remove in prod if noisy)
		// log.Printf("Admin Check: IP='%s' XFF='%s'", clientIP, xff)

		if clientIP == "" {
			// If we STILL can't determine IP, block it safe?
			// Or allow 127.0.0.1 if really local?
			log.Println("Admin Check: Empty IP detected, blocking.")
			return c.Status(403).JSON(fiber.Map{"error": "Access Denied: Set X-Forwarded-For"})
		}

		// Check Whitelist (Redis Hash: IP -> Label)
		allowed, err := rdb.HExists(context.Background(), AdminWhitelistKey, clientIP).Result()
		if err != nil {
			log.Printf("Admin IP Check Error: %v", err)
			return c.SendStatus(500)
		}

		if !allowed {
			// Debug: Log headers to see what we are missing
			headers := ""
			c.Request().Header.VisitAll(func(key, value []byte) {
				headers += string(key) + "=" + string(value) + "; "
			})
			log.Printf("Admin Access Blocked: '%s' | Headers: %s", clientIP, headers)
			return c.Status(403).JSON(fiber.Map{"error": "Access Denied: IP not whitelisted"})
		}

		return c.Next()
	}
}

// AdminAuthMiddleware validates the session cookie
func AdminAuthMiddleware(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		token := c.Cookies("admin_session")
		if token == "" {
			return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
		}

		username, err := rdb.Get(context.Background(), AdminSessionPrefix+token).Result()
		if err == redis.Nil || username == "" {
			return c.Status(401).JSON(fiber.Map{"error": "Session expired"})
		}

		c.Locals("admin_user", username)
		return c.Next()
	}
}

// --- Handlers ---

func HandleLogin(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req LoginRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}

		// Get User
		jsonUser, err := rdb.Get(context.Background(), AdminUserPrefix+req.Username).Result()
		if err == redis.Nil {
			time.Sleep(100 * time.Millisecond) // Mitigation
			return c.Status(401).JSON(fiber.Map{"error": "Invalid credentials"})
		}

		var user AdminUser
		json.Unmarshal([]byte(jsonUser), &user)

		// Verify Password
		if !CheckPasswordHash(req.Password, user.PasswordHash) {
			return c.Status(401).JSON(fiber.Map{"error": "Invalid credentials"})
		}

		// Create Session
		token, _ := GenerateRandomString(32)
		rdb.Set(context.Background(), AdminSessionPrefix+token, user.Username, SessionDuration)

		// Set Cookie
		c.Cookie(&fiber.Cookie{
			Name:     "admin_session",
			Value:    token,
			Expires:  time.Now().Add(SessionDuration),
			HTTPOnly: true,
			SameSite: "Strict",
			Secure:   false, // Set to true if ONLY HTTPS. We'll stick to false for dev/flexibility unless strict https enforced.
		})

		return c.JSON(fiber.Map{"status": "success", "username": user.Username})
	}
}

func HandleLogout(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		token := c.Cookies("admin_session")
		if token != "" {
			rdb.Del(context.Background(), AdminSessionPrefix+token)
		}
		c.ClearCookie("admin_session")
		return c.JSON(fiber.Map{"status": "logged_out"})
	}
}

func HandleCheckAuth(c *fiber.Ctx) error {
	user := c.Locals("admin_user").(string)
	return c.JSON(fiber.Map{"status": "authenticated", "username": user})
}

// HandleChangePassword allows users to change their own password
func HandleChangePassword(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		username := c.Locals("admin_user").(string)

		var req struct {
			NewPassword string `json:"new_password"`
		}
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}

		if len(req.NewPassword) < 10 {
			return c.Status(400).JSON(fiber.Map{"error": "Password must be at least 10 characters"})
		}

		// Update User
		hash, _ := HashPassword(req.NewPassword)

		// Fetch existing to preserve role
		jsonUser, _ := rdb.Get(context.Background(), AdminUserPrefix+username).Result()
		var user AdminUser
		json.Unmarshal([]byte(jsonUser), &user)

		user.PasswordHash = hash
		SaveAdminUser(rdb, &user)

		return c.JSON(fiber.Map{"status": "password_updated"})
	}
}

// --- Feature Handlers ---

// HandleListKeys returns all API keys
func HandleListKeys(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Scan for keys with prefix apikey:gk_
		// Auth logic expects 'apikey:' prefix
		prefixScan := "apikey:gk_*"

		iter := rdb.Scan(context.Background(), 0, prefixScan, 0).Iterator()
		keys := []map[string]interface{}{} // Initialize as empty slice

		for iter.Next(context.Background()) {
			key := iter.Val()
			val, err := rdb.Get(context.Background(), key).Result()
			if err == nil {
				var meta APIKey
				json.Unmarshal([]byte(val), &meta)

				// Display Key (strip internal prefix for display matching logic if needed?)
				// But we just return what we found.
				// The actual API key token is inside 'key' as 'apikey:gk_...'
				// The Token the user uses is just 'gk_...'
				// So we should strip 'apikey:' for key_id logic if we want to be clean,
				// OR just use the full redis key as ID.
				// Let's strip 'apikey:' from the 'prefix' display logic.

				realToken := strings.TrimPrefix(key, "apikey:")

				// Prefix logic
				displayPrefix := "gk_???..."
				if len(realToken) > 12 {
					displayPrefix = realToken[:12] + "..."
				}

				keys = append(keys, map[string]interface{}{
					"prefix":  displayPrefix,
					"name":    meta.Name,
					"created": meta.CreatedAt,
					"enabled": meta.Enabled,
					"key_id":  key, // Internal Redis key for Deletion
				})
			}
		}
		return c.JSON(keys)
	}
}

// HandleGenerateKey creates a new API key
func HandleGenerateKey(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req struct {
			Name string `json:"name"`
		}
		if err := c.BodyParser(&req); err != nil || req.Name == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Name required"})
		}

		// Logic from keymgr.go
		rawToken, _ := GenerateRandomString(32)
		// The User-Facing Token
		userToken := "gk_" + rawToken
		// The Redis Key (Auth logic expects 'apikey:' prefix)
		redisKey := "apikey:" + userToken

		now := time.Now()
		meta := APIKey{
			Key:       userToken, // Store the token itself in metadata too
			Name:      req.Name,
			CreatedAt: now,
			Enabled:   true,
		}

		data, _ := json.Marshal(meta)
		rdb.Set(context.Background(), redisKey, data, 0)

		return c.JSON(fiber.Map{
			"status":  "created",
			"key":     userToken, // Return the USABLE token (gk_...)
			"name":    req.Name,
			"created": now.Format(time.RFC3339),
		})
	}
}

// HandleDeleteKey deletes an API key (disable or hard delete?)
func HandleDeleteKey(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req struct {
			Key string `json:"key"` // internal redis key 'apikey:gk_...'
		}
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}

		// Ensure we are deleting correct keys
		if !strings.HasPrefix(req.Key, "apikey:gk_") && !strings.HasPrefix(req.Key, "gk_") {
			// Handle migration: if passed raw gk_, prepend.
			// But UI sends what ListKeys sent as 'key_id'.
			// If ListKeys sent 'apikey:gk_', then we are good.
		}

		// Safety:
		targetKey := req.Key
		if strings.HasPrefix(targetKey, "gk_") {
			targetKey = "apikey:" + targetKey
		}

		rdb.Del(context.Background(), targetKey)
		return c.JSON(fiber.Map{"status": "deleted"})
	}
}

// HandleListWhitelist returns allowed IPs
func HandleListWhitelist(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		all, err := rdb.HGetAll(context.Background(), AdminWhitelistKey).Result()
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Redis error"})
		}
		return c.JSON(all)
	}
}

// HandleAddWhitelist adds an IP
func HandleAddWhitelist(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req struct {
			IP    string `json:"ip"`
			Label string `json:"label"`
		}
		if err := c.BodyParser(&req); err != nil || req.IP == "" {
			return c.Status(400).JSON(fiber.Map{"error": "IP required"})
		}

		rdb.HSet(context.Background(), AdminWhitelistKey, req.IP, req.Label)
		return c.JSON(fiber.Map{"status": "added"})
	}
}

// HandleRemoveWhitelist removes an IP
func HandleRemoveWhitelist(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req struct {
			IP string `json:"ip"`
		}
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}

		// Prevent removing self or default?
		// Let's assume user knows what they are doing.
		if req.IP == "68.58.169.45" {
			// Optional: warn?
		}

		rdb.HDel(context.Background(), AdminWhitelistKey, req.IP)
		return c.JSON(fiber.Map{"status": "removed"})
	}
}

// HandleGetConfig returns Gateway config
func HandleGetConfig(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// We only expose limited config
		key, _ := rdb.HGet(context.Background(), "config:gateway", "deepseek_api_key").Result()

		// Mask the key
		masked := "Not Configured"
		if key != "" && len(key) > 4 {
			masked = key[:4] + "..." + key[len(key)-4:]
		}

		return c.JSON(fiber.Map{
			"deepseek_api_key": masked,
		})
	}
}

// HandleUpdateConfig updates Gateway config
func HandleUpdateConfig(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req struct {
			DeepSeekKey string `json:"deepseek_api_key"`
		}
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}

		if req.DeepSeekKey != "" {
			rdb.HSet(context.Background(), "config:gateway", "deepseek_api_key", req.DeepSeekKey)

			// Update runtime variable if we are caching it?
			// Ideally Gateway logic reads Redis on every request or caches it.
			// We'll update logic in main.go to read from Redis.
		}

		return c.JSON(fiber.Map{"status": "updated"})
	}
}

// HandleListUsers returns all admin users
func HandleListUsers(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var users []map[string]interface{}
		iter := rdb.Scan(context.Background(), 0, AdminUserPrefix+"*", 0).Iterator()

		for iter.Next(context.Background()) {
			key := iter.Val()
			val, err := rdb.Get(context.Background(), key).Result()
			if err == nil {
				var user AdminUser
				json.Unmarshal([]byte(val), &user)
				users = append(users, map[string]interface{}{
					"username":   user.Username,
					"role":       user.Role,
					"created_at": user.CreatedAt,
				})
			}
		}
		return c.JSON(users)
	}
}

// HandleCreateUser creates a new admin user
func HandleCreateUser(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}

		if req.Username == "" || len(req.Password) < 10 {
			return c.Status(400).JSON(fiber.Map{"error": "Username required and password must be at least 10 chars"})
		}

		// Check if user exists
		exists, _ := rdb.Exists(context.Background(), AdminUserPrefix+req.Username).Result()
		if exists > 0 {
			return c.Status(409).JSON(fiber.Map{"error": "User already exists"})
		}

		hash, _ := HashPassword(req.Password)
		user := AdminUser{
			Username:     req.Username,
			PasswordHash: hash,
			Role:         "admin", // Default role
			CreatedAt:    time.Now(),
		}

		if err := SaveAdminUser(rdb, &user); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to save user"})
		}

		return c.JSON(fiber.Map{"status": "created", "username": user.Username})
	}
}

// --- Helpers ---

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(bytes), err
}

func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

func SaveAdminUser(rdb *redis.Client, user *AdminUser) error {
	data, _ := json.Marshal(user)
	return rdb.Set(context.Background(), AdminUserPrefix+user.Username, data, 0).Err()
}

func GenerateRandomString(n int) (string, error) {
	b := make([]byte, n)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}
