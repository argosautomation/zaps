package services

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/mailgun/mailgun-go/v4"
)

var mg *mailgun.MailgunImpl

// InitMailgun initializes the Mailgun client
func InitMailgun() {
	domain := os.Getenv("MAILGUN_DOMAIN")
	apiKey := os.Getenv("MAILGUN_API_KEY")

	if domain == "" || apiKey == "" {
		log.Println("⚠️  Mailgun not configured - emails will be logged only (dev mode)")
		return
	}

	mg = mailgun.NewMailgun(domain, apiKey)
	log.Println("✓ Mailgun initialized")
}

// SendVerificationEmail sends account verification email
func SendVerificationEmail(email, token string) error {
	if mg == nil {
		// In dev mode, just log the verification link
		frontendURL := os.Getenv("FRONTEND_URL")
		verifyURL := fmt.Sprintf("%s/verify?token=%s", frontendURL, token)
		log.Printf("[Email - Dev Mode] Verification link for %s:\n%s", email, verifyURL)
		return nil
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	verifyURL := fmt.Sprintf("%s/verify?token=%s", frontendURL, token)

	subject := "Verify your Zaps.ai account ⚡"
	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0A0E27; color: #fff; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 40px auto; background: linear-gradient(135deg, #1a1f3a 0%%, #0A0E27 100%%); border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 102, 255, 0.2);">
        <!-- Header -->
        <div style="background: linear-gradient(90deg, #0066FF 0%%, #00FFFF 100%%); padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 32px; font-weight: bold; color: white;">⚡ Zaps.ai</h1>
            <p style="margin: 10px 0 0; font-size: 14px; color: rgba(255, 255, 255, 0.9);">Privacy-First LLM Gateway</p>
        </div>
        
        <!-- Body -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #00FFFF; margin-top: 0;">Welcome to Zaps.ai!</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #E5E5E5;">
                Thanks for signing up. You're one step away from protecting your sensitive data in LLM API calls.
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #E5E5E5;">
                Click the button below to verify your email address and activate your account:
            </p>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="%s" style="display: inline-block; background: linear-gradient(90deg, #0066FF 0%%, #0088FF 100%%); color: white; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(0, 102, 255, 0.4);">
                    Verify Email Address
                </a>
            </div>
            
            <p style="font-size: 14px; color: #999; margin-top: 30px;">
                Or copy and paste this link into your browser:<br>
                <span style="color: #00FFFF; word-break: break-all;">%s</span>
            </p>
            
            <p style="font-size: 14px; color: #999; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                This link expires in 24 hours. If you didn't create a Zaps.ai account, you can safely ignore this email.
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background: rgba(0, 0, 0, 0.3); padding: 20px; text-align: center; font-size: 12px; color: #999;">
            <p style="margin: 0;">
                Questions? Email us at <a href="mailto:support@zaps.ai" style="color: #00FFFF; text-decoration: none;">support@zaps.ai</a>
            </p>
            <p style="margin: 10px 0 0;">
                © 2026 Zaps.ai. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
	`, verifyURL, verifyURL)

	textBody := fmt.Sprintf(`
Welcome to Zaps.ai!

Thanks for signing up. Please verify your email address by visiting:

%s

This link expires in 24 hours.

If you didn't create this account, you can safely ignore this email.

Questions? Email us at support@zaps.ai
	`, verifyURL)

	message := mg.NewMessage(
		"Zaps.ai <noreply@"+os.Getenv("MAILGUN_DOMAIN")+">",
		subject,
		textBody,
		email,
	)
	message.SetHtml(htmlBody)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
	defer cancel()

	resp, id, err := mg.Send(ctx, message)
	if err != nil {
		log.Printf("❌ Failed to send verification email to %s: %v", email, err)
		return err
	}

	log.Printf("✉️  Verification email sent to %s (ID: %s, Response: %s)", email, id, resp)
	return nil
}

// SendPasswordResetEmail sends password reset instructions
func SendPasswordResetEmail(email, token string) error {
	if mg == nil {
		frontendURL := os.Getenv("FRONTEND_URL")
		resetURL := fmt.Sprintf("%s/reset-password?token=%s", frontendURL, token)
		log.Printf("[Email - Dev Mode] Password reset link for %s:\n%s", email, resetURL)
		return nil
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	resetURL := fmt.Sprintf("%s/reset-password?token=%s", frontendURL, token)

	subject := "Reset your Zaps.ai password"
	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; background-color: #0A0E27; color: #fff; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: #1a1f3a; border-radius: 8px; padding: 30px;">
        <h1 style="color: #00FFFF;">Reset Your Password</h1>
        <p style="font-size: 16px; line-height: 1.6;">
            We received a request to reset your Zaps.ai password. Click the button below to choose a new password:
        </p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="%s" style="display: inline-block; background: #0066FF; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold;">
                Reset Password
            </a>
        </div>
        <p style="font-size: 14px; color: #999;">
            Or copy this link: <span style="color: #00FFFF;">%s</span>
        </p>
        <p style="font-size: 14px; color: #999; margin-top: 30px;">
            This link expires in 1 hour. If you didn't request this, please ignore this email.
        </p>
    </div>
</body>
</html>
	`, resetURL, resetURL)

	message := mg.NewMessage(
		"Zaps.ai <noreply@"+os.Getenv("MAILGUN_DOMAIN")+">",
		subject,
		fmt.Sprintf("Reset your password: %s", resetURL),
		email,
	)
	message.SetHtml(htmlBody)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
	defer cancel()

	_, id, err := mg.Send(ctx, message)
	if err != nil {
		log.Printf("❌ Failed to send password reset email to %s: %v", email, err)
		return err
	}

	log.Printf("✉️  Password reset email sent to %s (ID: %s)", email, id)
	return nil
}
