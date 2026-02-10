package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/spf13/cobra"
)

var (
	cfgFile string
	apiKey  string
	apiURL  = "https://zaps.ai" // Default production URL
)

// Device Flow Structs
type DeviceAuthResponse struct {
	DeviceCode      string `json:"device_code"`
	UserCode        string `json:"user_code"`
	VerificationURI string `json:"verification_uri"`
	ExpiresIn       int    `json:"expires_in"`
	Interval        int    `json:"interval"`
}

type TokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	Error       string `json:"error"`
}

// Root Command
var rootCmd = &cobra.Command{
	Use:   "zaps",
	Short: "Zaps Connect - Secure Local Proxy for LLM Traffic",
	Long:  `Zaps Connect intercepts local traffic to known LLM providers and routes it through the Zaps.ai Gateway for governance and redaction.`,
	PersistentPreRun: func(cmd *cobra.Command, args []string) {
		// Allow overriding URL for testing
		if envURL := os.Getenv("ZAPS_URL"); envURL != "" {
			apiURL = envURL
		}
	},
}

// Login Command
var loginCmd = &cobra.Command{
	Use:   "login",
	Short: "Authenticate via Zaps.ai (Device Flow)",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("🔌 Connecting to Zaps...", apiURL)

		// 1. Request Device Code
		resp, err := http.Post(apiURL+"/auth/device/code", "application/json", nil)
		if err != nil {
			fmt.Printf("Error connecting to server: %v\n", err)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != 200 {
			fmt.Printf("Server returned error: %s\n", resp.Status)
			return
		}

		var authReq DeviceAuthResponse
		if err := json.NewDecoder(resp.Body).Decode(&authReq); err != nil {
			fmt.Printf("Error decoding response: %v\n", err)
			return
		}

		// 2. Display Code to User
		fmt.Println("\nAuthenticate your device:")
		fmt.Printf("1. Visit: %s\n", authReq.VerificationURI)
		fmt.Printf("2. Enter Code: %s\n\n", authReq.UserCode)

		// Try to open browser
		openBrowser(authReq.VerificationURI + "?user_code=" + authReq.UserCode)

		fmt.Println("Waiting for approval... (Press Ctrl+C to cancel)")

		// 3. Poll for Token
		ticker := time.NewTicker(time.Duration(authReq.Interval) * time.Second)
		defer ticker.Stop()

		timeout := time.After(time.Duration(authReq.ExpiresIn) * time.Second)

		for {
			select {
			case <-timeout:
				fmt.Println("Timeout waiting for approval. Please try again.")
				return
			case <-ticker.C:
				token, err := pollToken(authReq.DeviceCode)
				if err != nil {
					// Check for specific errors
					if err.Error() == "authorization_pending" {
						continue // Keep waiting
					}
					fmt.Printf("\nError: %v\n", err)
					return
				}

				// Success!
				saveCredentials(token)
				return
			}
		}
	},
}

func pollToken(deviceCode string) (string, error) {
	payload := map[string]string{"device_code": deviceCode}
	jsonBody, _ := json.Marshal(payload)

	resp, err := http.Post(apiURL+"/auth/device/token", "application/json", bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result TokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	if result.Error != "" {
		if result.Error == "authorization_pending" {
			return "", fmt.Errorf("authorization_pending")
		}
		return "", fmt.Errorf(result.Error)
	}

	return result.AccessToken, nil
}

func saveCredentials(key string) {
	home, err := os.UserHomeDir()
	if err != nil {
		fmt.Println("Error finding home directory:", err)
		return
	}

	configDir := filepath.Join(home, ".zaps")
	if err := os.MkdirAll(configDir, 0700); err != nil {
		fmt.Println("Error creating config directory:", err)
		return
	}

	configPath := filepath.Join(configDir, "credentials")
	if err := os.WriteFile(configPath, []byte(key), 0600); err != nil {
		fmt.Println("Error saving credentials:", err)
		return
	}

	fmt.Printf("\n✅ Successfully authorized! API Key saved to %s\n", configPath)
	fmt.Println("Run 'zaps connect' to start the proxy.")
}

func openBrowser(url string) {
	var err error
	switch runtime.GOOS {
	case "linux":
		err = exec.Command("xdg-open", url).Start()
	case "windows":
		err = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		err = exec.Command("open", url).Start()
	default:
		err = fmt.Errorf("unsupported platform")
	}
	if err != nil {
		// Ignore error, user can manually open
	}
}

// Connect Command
var connectCmd = &cobra.Command{
	Use:   "connect",
	Short: "Start the local proxy server",
	Run: func(cmd *cobra.Command, args []string) {
		// Verify Login
		home, _ := os.UserHomeDir()
		configPath := filepath.Join(home, ".zaps", "credentials")
		keyBytes, err := os.ReadFile(configPath)
		if err != nil {
			fmt.Println("Please login first: zaps login")
			return
		}
		apiKey = strings.TrimSpace(string(keyBytes))

		fmt.Println("Starting Zaps Connect Proxy on :8888...")
		fmt.Printf("Using API Key: %s****\n", apiKey[:4])
		fmt.Printf("Target Gateway: %s\n", apiURL)

		startProxy(apiKey, apiURL)
	},
}

func main() {
	rootCmd.AddCommand(loginCmd)
	rootCmd.AddCommand(connectCmd)

	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
