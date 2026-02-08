package api

import (
	"log"
	"os"

	"zaps/db"
	"zaps/services"

	"github.com/gofiber/fiber/v2"
	"github.com/stripe/stripe-go/v76/webhook"
)

// HandleCreateCheckoutSession initiates the checkout flow
func HandleCreateCheckoutSession(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)

	var req struct {
		PriceID string `json:"price_id"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	// Get Tenant and Stripe Customer ID
	var stripeCustomerID string
	var email string
	var name string

	err := db.DB.QueryRow(`
		SELECT stripe_customer_id, name, 'admin@' || name || '.com' as email -- Placeholder email logic
		FROM tenants 
		WHERE id = $1
	`, tenantID).Scan(&stripeCustomerID, &name, &email)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	// Create Customer if missing
	if stripeCustomerID == "" {
		stripeCustomerID, err = services.CreateStripeCustomer(email, name, map[string]string{
			"tenant_id": tenantID,
		})
		if err != nil {
			log.Printf("Failed to create Stripe customer: %v", err)
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create billing account"})
		}
		// Save back to DB
		_, err = db.DB.Exec("UPDATE tenants SET stripe_customer_id = $1 WHERE id = $2", stripeCustomerID, tenantID)
		if err != nil {
			log.Printf("Failed to save stripe_customer_id: %v", err)
		}
	}

	// Create Session
	domain := os.Getenv("FRONTEND_URL")
	if domain == "" {
		domain = "http://localhost:3001"
	}

	successURL := domain + "/dashboard/settings?checkout=success"
	cancelURL := domain + "/pricing?checkout=cancel"

	checkoutURL, err := services.CreateCheckoutSession(stripeCustomerID, req.PriceID, successURL, cancelURL)
	if err != nil {
		log.Printf("Failed to create checkout session: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to initiate checkout"})
	}

	return c.JSON(fiber.Map{"url": checkoutURL})
}

// HandlePortalSession creates a link to the billing portal
func HandlePortalSession(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)

	var stripeCustomerID string
	err := db.DB.QueryRow("SELECT stripe_customer_id FROM tenants WHERE id = $1", tenantID).Scan(&stripeCustomerID)

	if err != nil || stripeCustomerID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "No billing account found"})
	}

	domain := os.Getenv("FRONTEND_URL")
	if domain == "" {
		domain = "http://localhost:3001"
	}
	returnURL := domain + "/dashboard/settings"

	url, err := services.GeneratePortalLink(stripeCustomerID, returnURL)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create portal link"})
	}

	return c.JSON(fiber.Map{"url": url})
}

// HandleStripeWebhook handles async events from Stripe
func HandleStripeWebhook(c *fiber.Ctx) error {
	secret := os.Getenv("STRIPE_WEBHOOK_SECRET")
	payload := c.Body()
	sigHeader := c.Get("Stripe-Signature")

	event, err := webhook.ConstructEvent(payload, sigHeader, secret)
	if err != nil {
		return c.Status(400).SendString("Webhook Error: " + err.Error())
	}

	switch event.Type {
	case "checkout.session.completed":
		// Handle verification
		log.Println("Payment successful!")
	case "customer.subscription.updated":
		// Update DB
		log.Println("Subscription updated!")
	case "customer.subscription.deleted":
		// Update DB
		log.Println("Subscription canceled!")
	}

	return c.SendStatus(200)
}
