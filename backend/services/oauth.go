package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

var (
	googleOauthConfig *oauth2.Config
	oauthStateString  = "random-state-string-change-me" // In prod, generate random state
)

func InitOAuth() {
	clientID := os.Getenv("GOOGLE_CLIENT_ID")
	clientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	redirectURL := os.Getenv("GOOGLE_REDIRECT_URL")

	if clientID == "" || clientSecret == "" {
		fmt.Println("⚠️ Google OAuth not configured (missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET)")
		return
	}

	if redirectURL == "" {
		redirectURL = "http://localhost:3000/auth/google/callback" // Default for local dev
	}

	googleOauthConfig = &oauth2.Config{
		RedirectURL:  redirectURL,
		ClientID:     clientID,
		ClientSecret: clientSecret,
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
		},
		Endpoint: google.Endpoint,
	}
}

func GetGoogleLoginURL() string {
	if googleOauthConfig == nil {
		return ""
	}
	return googleOauthConfig.AuthCodeURL(oauthStateString)
}

func GetGoogleUser(code string) (map[string]interface{}, error) {
	if googleOauthConfig == nil {
		return nil, fmt.Errorf("Google OAuth not configured")
	}

	token, err := googleOauthConfig.Exchange(context.Background(), code)
	if err != nil {
		return nil, fmt.Errorf("code exchange failed: %s", err.Error())
	}

	response, err := http.Get("https://www.googleapis.com/oauth2/v2/userinfo?access_token=" + token.AccessToken)
	if err != nil {
		return nil, fmt.Errorf("failed getting user info: %s", err.Error())
	}
	defer response.Body.Close()

	contents, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, fmt.Errorf("failed reading response body: %s", err.Error())
	}

	var user map[string]interface{}
	if err := json.Unmarshal(contents, &user); err != nil {
		return nil, fmt.Errorf("failed unmarshaling user info: %s", err.Error())
	}

	return user, nil
}
