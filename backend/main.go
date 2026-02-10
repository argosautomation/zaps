package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/redis/go-redis/v9"

	"zaps/api"
	"zaps/db"
	"zaps/services"
)

const Port = ":3000"

var DeepSeekAPI = "https://api.deepseek.com"
var ctx = context.Background()
var rdb *redis.Client

func init() {
	if env := os.Getenv("DEEPSEEK_API_URL"); env != "" {
		DeepSeekAPI = env
	}
}

// Regex patterns for secret detection

func main() {
	// Connect to Redis
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "localhost:6379"
	}

	rdb = redis.NewClient(&redis.Options{
		Addr: redisURL,
	})

	// Test Redis connection
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("⚠️  Redis not available: %v. Running without caching.", err)
	} else {
		log.Println("✓ Connected to Redis")
	}

	// Initialize PostgreSQL
	if err := db.InitDB(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.CloseDB()

	// Initialize Email Service (Mailgun)
	// Initialize Email Service (Mailgun)
	services.InitMailgun()
	// Initialize OAuth
	services.InitOAuth()
	services.InitGitHubOAuth()
	services.InitStripe()

	// Initialize Admin Dashboard (legacy system)
	InitAdmin(rdb)

	// Setup Fiber
	app := fiber.New(fiber.Config{
		AppName:                 "Zaps.ai Gateway v2.0",
		EnableTrustedProxyCheck: true,
		TrustedProxies:          []string{"0.0.0.0/0"},
		ProxyHeader:             fiber.HeaderXForwardedFor,
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{"error": err.Error()})
		},
	})

	// Middleware
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${method} ${path} (${latency})\n",
	}))

	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = "*"
	}

	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3001, http://localhost:3000, https://app.glassdesk.ai, https://glassdesk.ai, https://zaps.ai, https://www.zaps.ai, https://api.zaps.ai",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, x-client-id",
		AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS",
		AllowCredentials: true,
	}))

	// Security Headers
	app.Use(helmet.New())

	// ==============================================
	// PUBLIC ROUTES
	// ==============================================

	// Playground Simulation
	app.Post("/api/playground/simulate", api.SimulateRedaction(rdb))

	// Health Check
	app.Get("/health", func(c *fiber.Ctx) error {
		dbHealthy := db.HealthCheck() == nil
		redisHealthy := rdb.Ping(ctx).Err() == nil

		status := "healthy"
		code := 200
		if !dbHealthy || !redisHealthy {
			status = "degraded"
			code = 503
		}

		return c.Status(code).JSON(fiber.Map{
			"status":   status,
			"database": dbHealthy,
			"redis":    redisHealthy,
			"version":  "2.0.0",
		})
	})

	// ==============================================
	// AUTHENTICATION ROUTES (New SaaS)
	// ==============================================

	// Rate Limiters
	// Strict: 5 requests per hour (Verification, Password Reset, Register)
	strictLimiter := limiter.New(limiter.Config{
		Max:        5,
		Expiration: 1 * time.Hour,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(429).JSON(fiber.Map{"error": "Too many requests. Please try again later."})
		},
	})

	// Login: 10 requests per minute (Brute force protection)
	loginLimiter := limiter.New(limiter.Config{
		Max:        10,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(429).JSON(fiber.Map{"error": "Too many login attempts. Please try again in a minute."})
		},
	})

	authGroup := app.Group("/auth")
	authGroup.Post("/register", strictLimiter, api.HandleRegister)
	authGroup.Post("/resend-verification", strictLimiter, api.HandleResendVerification)
	authGroup.Get("/verify", api.HandleVerifyEmail)
	authGroup.Post("/login", loginLimiter, api.HandleLogin)
	authGroup.Post("/logout", api.HandleLogout)
	authGroup.Post("/password/forgot", strictLimiter, api.HandleRequestPasswordReset)
	authGroup.Post("/password/reset", api.HandleResetPassword(rdb))

	// Social Auth
	authGroup.Get("/google/login", api.HandleGoogleLogin)
	authGroup.Get("/google/callback", api.HandleGoogleCallback)
	authGroup.Get("/github/login", api.HandleGitHubLogin)
	authGroup.Get("/github/callback", api.HandleGitHubCallback)
	// Device Auth (RFC 8628)
	authGroup.Post("/device/code", loginLimiter, func(c *fiber.Ctx) error {
		code, err := services.RequestDeviceCode(rdb)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to generate device code"})
		}
		return c.JSON(code)
	})
	authGroup.Post("/device/token", func(c *fiber.Ctx) error {
		var req struct {
			DeviceCode string `json:"device_code"`
		}
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}
		token, err := services.PollToken(rdb, req.DeviceCode)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		if token.Error != "" {
			// RFC 8628 says authorization_pending should be 400 (Bad Request) or similar, but
			// standard is often 400 with specific error code.
			// Example: { "error": "authorization_pending" }
			return c.Status(400).JSON(token)
		}
		return c.JSON(token)
	})

	// Stripe Webhook (Public)
	app.Post("/webhooks/stripe", api.HandleStripeWebhook)

	// ==============================================
	// DASHBOARD & NEW ADMIN ROUTES (New SaaS)
	// ==============================================

	apiGroup := app.Group("/api")

	// Protected Billing Routes
	billing := apiGroup.Group("/billing", AuthMiddleware(rdb))
	billing.Post("/checkout", api.HandleCreateCheckoutSession)
	billing.Post("/portal", api.HandleCreatePortalSession)

	// Super Admin Routes
	admin := apiGroup.Group("/admin", AuthMiddleware(rdb), api.SuperAdminMiddleware())
	admin.Get("/tenants", api.HandleListTenants)
	admin.Put("/tenants/:id", api.HandleUpdateTenant)

	// Protected Dashboard API
	dashboard := apiGroup.Group("/dashboard", AuthMiddleware(rdb))
	dashboard.Get("/stats", api.GetDashboardStats)
	dashboard.Get("/keys", api.GetAPIKeys)
	dashboard.Post("/keys", api.CreateAPIKey(rdb))
	dashboard.Delete("/keys/:id", api.RevokeAPIKey)
	dashboard.Get("/logs", api.GetAuditLogs)
	dashboard.Get("/reports/export", api.ExportAuditLogs)
	dashboard.Get("/providers", api.GetProviders(rdb))
	dashboard.Post("/providers", api.UpdateProvider(rdb))
	dashboard.Delete("/providers/:name", api.DeleteProvider(rdb))

	// User & Organization Management
	dashboard.Get("/profile", api.GetProfile)
	dashboard.Put("/profile", api.UpdateProfile)
	dashboard.Get("/organization", api.GetOrganization)
	dashboard.Put("/organization", api.UpdateOrganization)
	dashboard.Post("/security/password", api.ChangePassword)
	dashboard.Get("/security/status", api.GetSecurityStatus)
	dashboard.Post("/security/2fa/generate", api.Generate2FA)
	dashboard.Post("/security/2fa/enable", api.Enable2FA)
	dashboard.Post("/security/2fa/disable", api.Disable2FA)

	// Device Approval
	dashboard.Post("/device/approve", func(c *fiber.Ctx) error {
		ownerID := c.Locals("owner_id").(string)
		var req struct {
			UserCode string `json:"user_code"`
		}
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}

		if err := services.ApproveDevice(rdb, req.UserCode, ownerID); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid or expired code"})
		}

		services.LogAuditAsync(c.Locals("tenant_id").(string), nil, "DEVICE_APPROVED", map[string]interface{}{"user_code": req.UserCode}, c.IP(), c.Get("User-Agent"))

		return c.JSON(fiber.Map{"status": "approved"})
	})

	// Admin Routes (Protected)
	// admin := apiGroup.Group("/admin", AuthMiddleware(rdb))

	// ==============================================
	// LEGACY ADMIN ROUTES (Old System)
	// ==============================================

	// Admin Static Files (IP Whitelist Protected)
	adminGroup := app.Group("/admin", IPWhitelistMiddleware(rdb))
	adminGroup.Static("/", "./public")

	// Admin API
	apiAdmin := app.Group("/api/admin")

	// Public Admin Endpoints (Login)
	apiAdmin.Post("/login", HandleLogin(rdb))
	apiAdmin.Post("/logout", HandleLogout(rdb))

	// Protected Admin Endpoints
	SECURED := apiAdmin.Group("/", AdminAuthMiddleware(rdb))
	SECURED.Get("/check-auth", HandleCheckAuth)
	SECURED.Post("/change-password", HandleChangePassword(rdb))

	// Feature Routes
	SECURED.Get("/keys", HandleListKeys(rdb))
	SECURED.Post("/keys", HandleGenerateKey(rdb))
	SECURED.Delete("/keys", HandleDeleteKey(rdb))

	SECURED.Get("/whitelist", HandleListWhitelist(rdb))
	SECURED.Post("/whitelist", HandleAddWhitelist(rdb))
	SECURED.Delete("/whitelist", HandleRemoveWhitelist(rdb))

	SECURED.Get("/config", HandleGetConfig(rdb))
	SECURED.Post("/config", HandleUpdateConfig(rdb))

	SECURED.Get("/users", HandleListUsers(rdb))
	SECURED.Post("/users", HandleCreateUser(rdb))

	// Provider Config
	SECURED.Get("/providers", HandleGetProviders(rdb))
	SECURED.Post("/providers", HandleUpdateProviders(rdb))

	// ==============================================
	// GATEWAY PROXY (PII Redaction)
	// ==============================================

	// Main proxy endpoint (Protected by API Key auth only)
	apiProxy := app.Group("/v1")
	apiProxy.Use(AuthMiddleware(rdb))
	// Use new API handlers
	apiProxy.Post("/chat/completions", api.HandleChatCompletion(rdb))
	apiProxy.Get("/models", api.HandleListModels(rdb))

	log.Printf("🚀 Zaps.ai Gateway starting on %s", Port)
	log.Fatal(app.Listen(Port))
}
