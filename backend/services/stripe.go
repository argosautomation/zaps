package services

import (
	"fmt"
	"os"

	"github.com/stripe/stripe-go/v76"
	portalsession "github.com/stripe/stripe-go/v76/billingportal/session"
	"github.com/stripe/stripe-go/v76/checkout/session"
	"github.com/stripe/stripe-go/v76/customer"
	"github.com/stripe/stripe-go/v76/subscription"
)

func InitStripe() {
	key := os.Getenv("STRIPE_SECRET_KEY")
	if key == "" {
		fmt.Println("⚠️ Stripe not configured (missing STRIPE_SECRET_KEY)")
		// Use a dummy key to prevent crashes if not set, but calls will fail
		stripe.Key = "sk_test_placeholder"
	} else {
		stripe.Key = key
	}
}

// CreateStripeCustomer creates a new customer in Stripe
func CreateStripeCustomer(email, name string, metadata map[string]string) (string, error) {
	params := &stripe.CustomerParams{
		Email: stripe.String(email),
		Name:  stripe.String(name),
	}
	for k, v := range metadata {
		params.AddMetadata(k, v)
	}
	c, err := customer.New(params)
	if err != nil {
		return "", err
	}
	return c.ID, nil
}

// CreateCheckoutSession creates a session for the user to pay
func CreateCheckoutSession(customerID, priceID, successURL, cancelURL string) (string, error) {
	params := &stripe.CheckoutSessionParams{
		Customer: stripe.String(customerID),
		Mode:     stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(priceID),
				Quantity: stripe.Int64(1),
			},
		},
		SuccessURL: stripe.String(successURL),
		CancelURL:  stripe.String(cancelURL),
	}

	s, err := session.New(params)
	if err != nil {
		return "", err
	}
	return s.URL, nil
}

// GeneratePortalLink creates a link to the self-serve portal
func GeneratePortalLink(customerID, returnURL string) (string, error) {
	params := &stripe.BillingPortalSessionParams{
		Customer:  stripe.String(customerID),
		ReturnURL: stripe.String(returnURL),
	}
	s, err := portalsession.New(params)
	if err != nil {
		return "", err
	}
	return s.URL, nil
}

// GetStripeSubscription fetches subscription details
func GetStripeSubscription(subID string) (*stripe.Subscription, error) {
	return subscription.Get(subID, nil)
}
