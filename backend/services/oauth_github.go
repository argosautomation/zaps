package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/github"
)

var githubOauthConfig *oauth2.Config

func InitGitHubOAuth() {
	clientID := os.Getenv("GITHUB_CLIENT_ID")
	clientSecret := os.Getenv("GITHUB_CLIENT_SECRET")
	redirectURL := os.Getenv("GITHUB_REDIRECT_URL")

	if clientID == "" || clientSecret == "" {
		fmt.Println("⚠️ GitHub OAuth not configured (missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET)")
		return
	}

	if redirectURL == "" {
		redirectURL = "http://localhost:3000/auth/github/callback"
	}

	githubOauthConfig = &oauth2.Config{
		RedirectURL:  redirectURL,
		ClientID:     clientID,
		ClientSecret: clientSecret,
		Scopes:       []string{"user:email", "read:user"},
		Endpoint:     github.Endpoint,
	}
}

func GetGitHubLoginURL() string {
	if githubOauthConfig == nil {
		return ""
	}
	// State should be random in prod
	return githubOauthConfig.AuthCodeURL("random-state-string")
}

func GetGitHubUser(code string) (map[string]interface{}, error) {
	if githubOauthConfig == nil {
		return nil, fmt.Errorf("GitHub OAuth not configured")
	}

	token, err := githubOauthConfig.Exchange(context.Background(), code)
	if err != nil {
		return nil, fmt.Errorf("code exchange failed: %s", err.Error())
	}

	client := githubOauthConfig.Client(context.Background(), token)

	// Get User Profile
	resp, err := client.Get("https://api.github.com/user")
	if err != nil {
		return nil, fmt.Errorf("failed getting user info: %s", err.Error())
	}
	defer resp.Body.Close()

	contents, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed reading response body: %s", err.Error())
	}

	var user map[string]interface{}
	if err := json.Unmarshal(contents, &user); err != nil {
		return nil, fmt.Errorf("failed unmarshaling user info: %s", err.Error())
	}

	// Get Email content if valid (sometimes private)
	if email, ok := user["email"].(string); !ok || email == "" {
		// Fetch emails if not in profile
		emailResp, err := client.Get("https://api.github.com/user/emails")
		if err == nil {
			defer emailResp.Body.Close()
			emailBody, _ := io.ReadAll(emailResp.Body)
			var emails []map[string]interface{}
			if err := json.Unmarshal(emailBody, &emails); err == nil {
				for _, e := range emails {
					if primary, ok := e["primary"].(bool); ok && primary {
						if verified, ok := e["verified"].(bool); ok && verified {
							user["email"] = e["email"]
							break
						}
					}
				}
			}
		}
	}

	return user, nil
}
