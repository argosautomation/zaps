package api

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"zaps/db"
	"zaps/services"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/webhook"
)

// HandleCreateCheckoutSession creates a Stripe Checkout session
func HandleCreateCheckoutSession(c *fiber.Ctx) error {
	log.Println("💰 Starting Checkout Session Creation...")
	tenantID, _ := uuid.Parse(c.Locals("tenant_id").(string))
	userID, _ := uuid.Parse(c.Locals("user_id").(string))

	var req struct {
		PriceID string `json:"priceID"`
	}
	if err := c.BodyParser(&req); err != nil {
		log.Printf("❌ Invalid request body: %v", err)
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	log.Printf("🔍 Requested Price ID: %s", req.PriceID)

	// 1. Get Tenant details
	var stripeCustomerID string
	var tenantName string
	var email string // User email for customer creation if needed

	err := db.DB.QueryRow("SELECT name, COALESCE(stripe_customer_id, '') FROM tenants WHERE id = $1", tenantID).Scan(&tenantName, &stripeCustomerID)
	if err != nil {
		log.Printf("❌ Failed to fetch tenant details: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch tenant"})
	}

	// Get user email for customer creation
	err = db.DB.QueryRow("SELECT email FROM users WHERE id = $1", userID).Scan(&email)
	if err != nil {
		log.Printf("❌ Failed to fetch user email: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch user email"})
	}

	log.Printf("👤 Tenant: %s, Customer ID: %s, Email: %s", tenantName, stripeCustomerID, email)

	// 2. Create Customer if missing
	if stripeCustomerID == "" {
		log.Println("🆕 Creating new Stripe Customer...")
		newCustID, err := services.CreateStripeCustomer(email, tenantName, map[string]string{
			"tenant_id": tenantID.String(),
		})
		if err != nil {
			log.Printf("❌ Failed to create Stripe customer: %v", err)
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create Stripe customer: " + err.Error()})
		}
		stripeCustomerID = newCustID
		log.Printf("✅ Created Customer: %s", stripeCustomerID)

		// Save to DB
		_, err = db.DB.Exec("UPDATE tenants SET stripe_customer_id = $1 WHERE id = $2", stripeCustomerID, tenantID)
		if err != nil {
			log.Printf("⚠️ Failed to save stripe_customer_id to DB (non-fatal): %v", err)
		}
	}

	// 3. Create Session
	// Check env for base URL
	baseURL := os.Getenv("APP_URL")
	if baseURL == "" {
		baseURL = "https://zaps.ai" // Default prod
	}

	log.Printf("🔗 Base URL: %s", baseURL)

	successURL := fmt.Sprintf("%s/dashboard/billing?success=true", baseURL)
	cancelURL := fmt.Sprintf("%s/dashboard/billing?canceled=true", baseURL)

	log.Println("🚀 Creating Checkout Session...")
	url, err := services.CreateCheckoutSession(stripeCustomerID, req.PriceID, successURL, cancelURL)
	if err != nil {
		log.Printf("❌ Failed to create checkout session: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create checkout session: " + err.Error()})
	}

	log.Printf("✅ Session Created: %s", url)
	return c.JSON(fiber.Map{"url": url})
}

// HandleCreatePortalSession creates a Billing Portal session
func HandleCreatePortalSession(c *fiber.Ctx) error {
	tenantID, _ := uuid.Parse(c.Locals("tenant_id").(string))

	var stripeCustomerID string
	err := db.DB.QueryRow("SELECT stripe_customer_id FROM tenants WHERE id = $1", tenantID).Scan(&stripeCustomerID)

	if err != nil || stripeCustomerID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "No billing account found"})
	}

	baseURL := os.Getenv("APP_URL")
	if baseURL == "" {
		baseURL = "https://zaps.ai"
	}
	returnURL := fmt.Sprintf("%s/dashboard/billing", baseURL)

	url, err := services.GeneratePortalLink(stripeCustomerID, returnURL)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create portal session"})
	}

	return c.JSON(fiber.Map{"url": url})
}

// HandleStripeWebhook processes Stripe events
func HandleStripeWebhook(c *fiber.Ctx) error {
	// 1. Verify Signature
	payload := c.Body()
	sigHeader := c.Get("Stripe-Signature")
	endpointSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")

	event, err := webhook.ConstructEventWithOptions(payload, sigHeader, endpointSecret, webhook.ConstructEventOptions{
		IgnoreAPIVersionMismatch: true,
	})
	if err != nil {
		// If secret is not set (dev mode), try parsing without verification or just log warning
		if endpointSecret == "" {
			log.Println("⚠️ STRIPE_WEBHOOK_SECRET not set, skipping signature verification (DEV MODE)")
			e, err := UnsafeParseEvent(payload)
			if err != nil {
				return c.Status(400).SendString("Invalid payload")
			}
			event = e
		} else {
			return c.Status(400).SendString("Webhook Error: " + err.Error())
		}
	}

	// 2. Handle Events
	switch event.Type {
	case "checkout.session.completed":
		var session stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
			return c.Status(400).SendString("Error parsing webhook JSON")
		}
		handleCheckoutCompleted(&session)

	case "customer.subscription.updated":
		var subscription stripe.Subscription
		if err := json.Unmarshal(event.Data.Raw, &subscription); err != nil {
			return c.Status(400).SendString("Error parsing webhook JSON")
		}
		handleSubscriptionUpdated(&subscription)

	case "customer.subscription.deleted":
		var subscription stripe.Subscription
		if err := json.Unmarshal(event.Data.Raw, &subscription); err != nil {
			return c.Status(400).SendString("Error parsing webhook JSON")
		}
		handleSubscriptionDeleted(&subscription)
	}

	return c.SendStatus(200)
}

// UnsafeParseEvent manually unmarshals event for dev mode without signature check
func UnsafeParseEvent(payload []byte) (stripe.Event, error) {
	var event stripe.Event
	if err := json.Unmarshal(payload, &event); err != nil {
		return stripe.Event{}, err
	}
	return event, nil
}

// handleCheckoutCompleted provisions the subscription after successful payment
func handleCheckoutCompleted(session *stripe.CheckoutSession) {
	if session.Customer == nil {
		return
	}
	customerID := session.Customer.ID
	subscriptionID := session.Subscription.ID

	log.Printf("💰 Checkout Completed: Customer %s, Sub %s", customerID, subscriptionID)

	// Fetch Subscription details to get status and plan
	sub, err := services.GetStripeSubscription(subscriptionID)
	if err != nil {
		log.Printf("❌ Failed to fetch subscription details: %v", err)
		return
	}

	// Delegate to update handler
	handleSubscriptionUpdated(sub)
}

// handleSubscriptionUpdated syncs Stripe status to DB
func handleSubscriptionUpdated(sub *stripe.Subscription) {
	customerID := sub.Customer.ID
	status := string(sub.Status)
	priceID := sub.Items.Data[0].Price.ID

	// Determine Tier based on Price ID (env vars or map)
	tier := "pro" // Default
	quota := 250000

	if priceID == os.Getenv("STRIPE_PRICE_STARTER") {
		tier = "starter"
		quota = 50000
	}
	// Enterprise handled manually via sales for now

	log.Printf("🔄 Syncing Subscription: %s is %s (%s) - Quota: %d", customerID, status, tier, quota)

	// Update Tenants Table
	_, err := db.DB.Exec(`
		UPDATE tenants 
		SET subscription_tier = $1, 
		    monthly_quota = $2,
		    updated_at = NOW()
		WHERE stripe_customer_id = $3
	`, tier, quota, customerID)

	if err != nil {
		log.Printf("❌ Failed to update tenant tier: %v", err)
	}

	// Update/Insert Subscriptions Table
	// We need tenant_id. Fetch it first.
	var tenantID string
	err = db.DB.QueryRow("SELECT id FROM tenants WHERE stripe_customer_id = $1", customerID).Scan(&tenantID)
	if err != nil {
		log.Printf("❌ Tenant not found for customer %s", customerID)
		return
	}

	currentStart := time.Unix(sub.CurrentPeriodStart, 0)
	currentEnd := time.Unix(sub.CurrentPeriodEnd, 0)

	_, err = db.DB.Exec(`
		INSERT INTO subscriptions (
			tenant_id, stripe_subscription_id, stripe_price_id, 
			plan, status, current_period_start, current_period_end
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (stripe_subscription_id) 
		DO UPDATE SET
			stripe_price_id = EXCLUDED.stripe_price_id,
			plan = EXCLUDED.plan,
			status = EXCLUDED.status,
			current_period_start = EXCLUDED.current_period_start,
			current_period_end = EXCLUDED.current_period_end,
			updated_at = NOW()
	`, tenantID, sub.ID, priceID, tier, status, currentStart, currentEnd)

	if err != nil {
		log.Printf("❌ Failed to upsert subscription: %v", err)
	}
}

// handleSubscriptionDeleted downgrades tenant to free
func handleSubscriptionDeleted(sub *stripe.Subscription) {
	customerID := sub.Customer.ID
	log.Printf("🚫 Subscription Deleted: %s", customerID)

	// Downgrade Tenant
	_, err := db.DB.Exec(`
		UPDATE tenants 
		SET subscription_tier = 'free', 
		    monthly_quota = 1000,
		    updated_at = NOW()
		WHERE stripe_customer_id = $1
	`, customerID)

	if err != nil {
		log.Printf("❌ Failed to downgrade tenant: %v", err)
	}

	// Update Subscription Status
	_, err = db.DB.Exec(`
		UPDATE subscriptions 
		SET status = 'canceled', 
		    canceled_at = NOW(),
		    updated_at = NOW()
		WHERE stripe_subscription_id = $1
	`, sub.ID)

	if err != nil {
		log.Printf("❌ Failed to cancel subscription record: %v", err)
	}
}
