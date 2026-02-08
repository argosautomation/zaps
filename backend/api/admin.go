package api

import (
	"database/sql"
	"zaps/db"

	"github.com/gofiber/fiber/v2"
)

// SuperAdminMiddleware checks if the authenticated user is a super admin
func SuperAdminMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("user_id").(string)

		var isSuperAdmin bool
		err := db.DB.QueryRow("SELECT is_super_admin FROM users WHERE id = $1", userID).Scan(&isSuperAdmin)
		if err != nil {
			if err == sql.ErrNoRows {
				return c.Status(401).JSON(fiber.Map{"error": "User not found"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Database error"})
		}

		if !isSuperAdmin {
			return c.Status(403).JSON(fiber.Map{"error": "Access denied: Super Admin only"})
		}

		return c.Next()
	}
}

// HandleListTenants returns all tenants with usage info
func HandleListTenants(c *fiber.Ctx) error {
	rows, err := db.DB.Query(`
		SELECT id, name, created_at, monthly_quota, current_usage, stripe_customer_id 
		FROM tenants 
		ORDER BY created_at DESC
	`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}
	defer rows.Close()

	var tenants []map[string]interface{}
	for rows.Next() {
		var t struct {
			ID               string
			Name             string
			CreatedAt        string
			MonthlyQuota     int
			CurrentUsage     int
			StripeCustomerID sql.NullString
		}
		if err := rows.Scan(&t.ID, &t.Name, &t.CreatedAt, &t.MonthlyQuota, &t.CurrentUsage, &t.StripeCustomerID); err != nil {
			continue
		}
		tenants = append(tenants, map[string]interface{}{
			"id":                 t.ID,
			"name":               t.Name,
			"created_at":         t.CreatedAt,
			"monthly_quota":      t.MonthlyQuota,
			"current_usage":      t.CurrentUsage,
			"stripe_customer_id": t.StripeCustomerID.String,
		})
	}

	return c.JSON(tenants)
}

// HandleUpdateTenant updates a tenant's quota or plan
func HandleUpdateTenant(c *fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		MonthlyQuota int `json:"monthly_quota"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	_, err := db.DB.Exec("UPDATE tenants SET monthly_quota = $1 WHERE id = $2", req.MonthlyQuota, id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update tenant"})
	}

	return c.JSON(fiber.Map{"status": "updated"})
}
