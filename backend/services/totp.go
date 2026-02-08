package services

import (
	"github.com/pquerna/otp/totp"
)

// GenerateTOTP generates a new TOTP secret and QR code URL
func GenerateTOTP(email string) (string, string, error) {
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "Zaps.ai",
		AccountName: email,
	})
	if err != nil {
		return "", "", err
	}
	return key.Secret(), key.URL(), nil
}

// ValidateTOTP validates a TOTP code against a secret
func ValidateTOTP(code string, secret string) bool {
	return totp.Validate(code, secret)
}
