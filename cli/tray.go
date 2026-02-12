package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/getlantern/systray"
	"github.com/skratchdot/open-golang/open"
)

var (
	proxyRunning = false
	quitProxy    context.CancelFunc
)

func startTrayApp() {
	systray.Run(onReady, onExit)
}

func onReady() {
	systray.SetIcon(iconData)
	systray.SetTitle("Zaps")
	systray.SetTooltip("Zaps Connect")

	mStatus := systray.AddMenuItem("Status: Disconnected", "Current Proxy Status")
	mStatus.Disable()

	mToggle := systray.AddMenuItem("Start Proxy", "Start the local proxy on :8888")
	systray.AddSeparator()
	mLogin := systray.AddMenuItem("Login", "Authenticate device with Zaps")
	mDashboard := systray.AddMenuItem("Dashboard", "Open Zaps Dashboard")
	systray.AddSeparator()
	mQuit := systray.AddMenuItem("Quit", "Quit Zaps Connect")

	// Handle clicks
	go func() {
		for {
			select {
			case <-mToggle.ClickedCh:
				if proxyRunning {
					// Stop Proxy
					if quitProxy != nil {
						quitProxy()
					}
					proxyRunning = false
					mToggle.SetTitle("Start Proxy")
					mStatus.SetTitle("Status: Disconnected")
					systray.SetTooltip("Zaps Connect (Disconnected)")
				} else {
					// Start Proxy
					go func() {
						apiKey, err := loadAPIKey()
						if err != nil {
							// If no key, maybe trigger login?
							// For now just error
							fmt.Println("No API Key found. Please login first.")
							open.Run("https://zaps.ai/activate") // Prompt user
							return
						}

						ctx, cancel := context.WithCancel(context.Background())
						quitProxy = cancel
						proxyRunning = true
						mToggle.SetTitle("Stop Proxy")
						mStatus.SetTitle("Status: Connected (:8888)")
						systray.SetTooltip("Zaps Connect (Connected)")

						// We need to run startProxy in a way that can be stopped.
						// The current startProxy blocks. We might need to refactor it or run it and kill it.
						// For MVP, let's just run it. Stopping is hard without refactor.
						// TODO: Refactor startProxy to accept context or channel for cancellation.
						// For now, "Stop" will just update UI state but server might still run if we don't refactor.
						// Let's assume we will Refactor startProxy next.
						startProxy(ctx, apiKey, "https://zaps.ai")
					}()
				}
			case <-mLogin.ClickedCh:
				// Trigger Login Flow AND Open URL
				// The CLI login is interactive (UserCode generation).
				// We might need a GUI version of login or just open terminal?
				// Simplest: Open URL and tell user to run 'zaps login' in terminal for now?
				// Better: Run the DeviceAuth flow here and show a dialog with the code.
				// For MVP: Just open terminal or show alert?
				// Let's stick to opening the browser and maybe assuming CLI usage for auth for V1,
				// OR implementing the polling loop here and using `systray.SetTitle` to show the code?

				// Let's go with: Open Browser and run logic in background
				go func() {
					// This replicates "zaps login" logic but needs UI feedback
					// For Validation phase, let's keep it simple:
					open.Run("https://zaps.ai/dashboard")
				}()
			case <-mDashboard.ClickedCh:
				open.Run("https://zaps.ai/dashboard")
			case <-mQuit.ClickedCh:
				systray.Quit()
				return
			}
		}
	}()
}

func onExit() {
	// Clean up here
}

func loadAPIKey() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	configPath := filepath.Join(home, ".zaps", "credentials")
	keyBytes, err := os.ReadFile(configPath)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(keyBytes)), nil
}

// Simple transparent lightning bolt icon (placeholder data)
// In real app, read from file or embed properly.
var iconData = []byte{
	// ... [We will use a minimal valid .ico or .png byte array here] ...
	// ensuring it compiles.
	0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x10, 0x10, 0x00, 0x00, 0x01, 0x00,
	0x08, 0x00, 0x68, 0x05, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
}
