package services

import (
	"context"
	"fmt"
	"log"
	"regexp"
	"time"

	"github.com/redis/go-redis/v9"
)

// Regex patterns for secret detection
var SecretPatterns = map[string]*regexp.Regexp{
	"OPENAI_KEY":   regexp.MustCompile(`sk-[a-zA-Z0-9_-]{20,}`),
	"EMAIL":        regexp.MustCompile(`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`),
	"PHONE":        regexp.MustCompile(`\b(\d{3}[-.]?)?\d{3}[-.]?\d{4}\b`),
	"CREDIT_CARD":  regexp.MustCompile(`\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b`),
	"GITHUB_TOKEN": regexp.MustCompile(`ghp_[a-zA-Z0-9]{36,}`),
	"STRIPE_KEY":   regexp.MustCompile(`sk_live_[a-zA-Z0-9]{24,}`),
	"AWS_KEY":      regexp.MustCompile(`AKIA[0-9A-Z]{16}`),
	"GENERIC_API":  regexp.MustCompile(`(?i)(api[_-]?key|secret[_-]?key|access[_-]?token)[\s:=]+['\"]?([a-zA-Z0-9_-]{20,})['\"]?`),
}

// RedactSecrets finds secrets and replaces them with tokens
// redisClient can be nil if caching is not needed (e.g. strict simulation)
func RedactSecrets(ctx context.Context, input string, clientID string, rdb *redis.Client) (string, map[string]string) {
	secrets := make(map[string]string)
	output := input

	for label, regex := range SecretPatterns {
		output = regex.ReplaceAllStringFunc(output, func(match string) string {
			// Generate unique token
			timestamp := time.Now().UnixNano()
			token := fmt.Sprintf("<SECRET:%s:%d>", label, timestamp)

			// Store mapping
			secrets[token] = match

			// Cache in Redis (TTL 10 mins)
			if rdb != nil {
				rdb.Set(ctx, token, match, 10*time.Minute)
				log.Printf("[%s] Redacted %s: %s -> %s", clientID, label, MaskSecret(match), token)
			}

			return token
		})
	}

	return output, secrets
}

// RehydrateSecrets restores original secrets from tokens
func RehydrateSecrets(ctx context.Context, input string, secretMap map[string]string, rdb *redis.Client) string {
	output := input

	// First try in-memory map
	for token, original := range secretMap {
		if input != replaceAll(input, token, original) {
			output = replaceAll(output, token, original)
			if regexp.MustCompile(regexp.QuoteMeta(token)).MatchString(input) {
				log.Printf("[Rehydration] Restored %s -> %s", token, MaskSecret(original))
			}
		}
	}

	// Fallback to Redis for any remaining tokens
	tokenRegex := regexp.MustCompile(`<SECRET:\s*([A-Z_]+)\s*:\s*(\d+)\s*>`)
	output = tokenRegex.ReplaceAllStringFunc(output, func(match string) string {
		submatches := tokenRegex.FindStringSubmatch(match)
		if len(submatches) != 3 {
			return match
		}
		label := submatches[1]
		id := submatches[2]

		strictToken := fmt.Sprintf("<SECRET:%s:%s>", label, id)

		if val, ok := secretMap[strictToken]; ok {
			return val
		}

		if rdb != nil {
			if val, err := rdb.Get(ctx, strictToken).Result(); err == nil {
				log.Printf("[Rehydration] Restored (Redis) %s -> %s", strictToken, MaskSecret(val))
				return val
			}
		}

		return match
	})

	return output
}

func replaceAll(s, old, new string) string {
	return regexp.MustCompile(regexp.QuoteMeta(old)).ReplaceAllString(s, new)
}

func MaskSecret(s string) string {
	if len(s) <= 8 {
		return "***"
	}
	return s[:4] + "..." + s[len(s)-4:]
}

// SanitizeMap creates a copy of the secret map with masked values
func SanitizeMap(secrets map[string]string) map[string]string {
	sanitized := make(map[string]string)
	for k, v := range secrets {
		sanitized[k] = MaskSecret(v)
	}
	return sanitized
}
