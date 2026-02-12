package main

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/url"
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

// Login Command (PKCE / Localhost Callback)
var loginCmd = &cobra.Command{
	Use:   "login",
	Short: "Authenticate via Zaps.ai (Browser Flow)",
	Run: func(cmd *cobra.Command, args []string) {
		// 1. Start Local Server
		listener, err := net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			fmt.Printf("Failed to start local listener: %v\n", err)
			return
		}
		port := listener.Addr().(*net.TCPAddr).Port

		fmt.Printf("🔌 Started local listener on port %d\n", port)
		fmt.Println("Opening browser to authenticate...")

		// Channel to receive token
		tokenCh := make(chan string)

		// Handler
		http.HandleFunc("/callback", func(w http.ResponseWriter, r *http.Request) {
			key := r.URL.Query().Get("key")
			if key != "" {
				tokenCh <- key
				fmt.Fprint(w, `<html><body style="font-family:sans-serif;text-align:center;padding-top:50px;">
					<h1 style="color:green">Authentication Successful</h1>
					<p>You can close this tab and return to your terminal.</p>
					<script>setTimeout(function(){window.close()}, 2000);</script>
				</body></html>`)
			} else {
				fmt.Fprint(w, "Error: No key received.")
			}
		})

		server := &http.Server{}
		go func() { server.Serve(listener) }()

		// 2. Open Browser
		redirectURI := fmt.Sprintf("http://localhost:%d/callback", port)
		authURL := fmt.Sprintf("%s/auth/cli?redirect_uri=%s", apiURL, url.QueryEscape(redirectURI))
		openBrowser(authURL)

		// 3. Wait for Token
		fmt.Println("Waiting for browser authentication...")
		select {
		case token := <-tokenCh:
			saveCredentials(token)
			server.Shutdown(context.Background())
		case <-time.After(2 * time.Minute):
			fmt.Println("❌ Authentication timed out.")
			server.Shutdown(context.Background())
		}
	},
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

		startProxy(context.Background(), apiKey, apiURL)
	},
}

// App Command (Menu Bar)
var appCmd = &cobra.Command{
	Use:   "app",
	Short: "Start the Zaps Connect Menu Bar App",
	Run: func(cmd *cobra.Command, args []string) {
		startTrayApp()
	},
}

func main() {
	rootCmd.AddCommand(loginCmd)
	rootCmd.AddCommand(connectCmd)
	rootCmd.AddCommand(appCmd)

	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
