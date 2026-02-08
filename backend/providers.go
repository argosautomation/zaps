package main

import (
	"context"
	"strings"

	"github.com/redis/go-redis/v9"
)

// Provider request constants
const (
	ProviderOpenAI    = "openai"
	ProviderAnthropic = "anthropic"
	ProviderDeepSeek  = "deepseek"
	ProviderGemini    = "gemini"
)

// ProviderModels maps providers to their supported models
var ProviderModels = map[string][]string{
	ProviderOpenAI:    {"gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo", "o1-preview", "o1-mini"},
	ProviderDeepSeek:  {"deepseek-chat", "deepseek-reasoner"},
	ProviderAnthropic: {"claude-3-5-sonnet", "claude-3-opus", "claude-3-haiku"},
	ProviderGemini:    {"gemini-pro", "gemini-1.5-pro", "gemini-1.5-flash"},
}

// ProviderConfig represents user-specific provider settings
type ProviderConfig struct {
	ApiKey string `json:"api_key"`
}

// GetProviderForModel determines which provider to use based on the model name
func GetProviderForModel(model string) string {
	model = strings.ToLower(model)
	if strings.HasPrefix(model, "gpt") || strings.HasPrefix(model, "o1-") {
		return ProviderOpenAI
	}
	if strings.HasPrefix(model, "claude") {
		return ProviderAnthropic
	}
	if strings.HasPrefix(model, "deepseek") {
		return ProviderDeepSeek
	}
	if strings.HasPrefix(model, "gemini") {
		return ProviderGemini
	}
	// Default fallbacks? Or strict?
	// Let's default to OpenAI if unknown, or maybe return error.
	// For now, default to DeepSeek as legacy behavior if unsure,
	// OR return empty to let caller decide.
	return ""
}

// GetProviderURL returns the base URL for the provider
func GetProviderURL(provider string) string {
	switch provider {
	case ProviderOpenAI:
		return "https://api.openai.com/v1"
	case ProviderAnthropic:
		return "https://api.anthropic.com/v1"
	case ProviderDeepSeek:
		return "https://api.deepseek.com" // V1 not usually in base? Actually /v1/chat/completions is common standard.
		// DeepSeek usually is compatible with OpenAI endpoint style: https://api.deepseek.com/chat/completions -> https://api.deepseek.com
	case ProviderGemini:
		return "https://generativelanguage.googleapis.com/v1beta/openai"
	}
	return ""
}

// SaveProviderKey saves a user's API key for a specific provider
func SaveProviderKey(rdb *redis.Client, username string, provider string, apiKey string) error {
	ctx := context.Background()
	key := "user:" + username + ":providers"
	return rdb.HSet(ctx, key, provider, apiKey).Err()
}

// GetProviderKey retrieves a user's API key for a provider
func GetProviderKey(rdb *redis.Client, username string, provider string) (string, error) {
	ctx := context.Background()
	key := "user:" + username + ":providers"
	val, err := rdb.HGet(ctx, key, provider).Result()
	if err == redis.Nil {
		return "", nil // Not configured
	}
	if err != nil {
		return "", err
	}
	return val, nil
}

// GetAllProviders retrieves all configured providers for a user
func GetAllProviders(rdb *redis.Client, username string) (map[string]string, error) {
	ctx := context.Background()
	key := "user:" + username + ":providers"
	return rdb.HGetAll(ctx, key).Result()
}
