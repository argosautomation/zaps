package main

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"
)

var (
	cfgFile string
	apiKey  string
)

// Root Command
var rootCmd = &cobra.Command{
	Use:   "zaps",
	Short: "Zaps Connect - Secure Local Proxy for LLM Traffic",
	Long:  `Zaps Connect intercepts local traffic to known LLM providers and routes it through the Zaps.ai Gateway for governance and redaction.`,
}

// Login Command
var loginCmd = &cobra.Command{
	Use:   "login",
	Short: "Authenticate with your Zaps API Key",
	Run: func(cmd *cobra.Command, args []string) {
		reader := bufio.NewReader(os.Stdin)
		fmt.Print("Enter your Zaps API Key (gk_...): ")
		key, _ := reader.ReadString('\n')
		key = strings.TrimSpace(key)

		if key == "" {
			fmt.Println("API Key cannot be empty.")
			return
		}

		if !strings.HasPrefix(key, "gk_") {
			fmt.Println("Invalid API Key format. Must start with 'gk_'.")
			return
		}

		// Save to ~/.zaps/credentials
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

		fmt.Println("Successfully logged in! Key saved to", configPath)
	},
}

// Connect Command (Placeholder)
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

		startProxy(apiKey)
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
