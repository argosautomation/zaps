package main

import (
	"context"
	"log"
	"net/http"
	"net/url"
	"time"

	"github.com/elazarl/goproxy"
)

func startProxy(ctx context.Context, apiKey string, targetURL string) {
	proxy := goproxy.NewProxyHttpServer()
	proxy.Verbose = true

	// Parse Target URL
	target, err := url.Parse(targetURL)
	if err != nil {
		log.Fatal("Invalid Target URL:", err)
	}

	// Standard MITM for HTTPS (Note: This will cause certificate warnings in browsers/curl without -k)
	proxy.OnRequest().HandleConnect(goproxy.AlwaysMitm)

	// Intercept requests to DeepSeek
	proxy.OnRequest(goproxy.DstHostIs("api.deepseek.com")).DoFunc(
		func(r *http.Request, ctx *goproxy.ProxyCtx) (*http.Request, *http.Response) {
			log.Printf("🛡️  Zaps Intercept: %s%s", r.Host, r.URL.Path)

			// Rewrite Target to Zaps Gateway
			r.URL.Scheme = target.Scheme
			r.URL.Host = target.Host
			r.Host = target.Host // Critical for SNI and Host header

			// Adjust Path for OpenAI compatibility
			// DeepSeek: /chat/completions -> Zaps: /v1/chat/completions
			// If already /v1/chat/completions, keep it.
			if r.URL.Path == "/chat/completions" {
				r.URL.Path = "/v1/chat/completions"
			}

			// Inject Zaps API Key
			r.Header.Set("Authorization", "Bearer "+apiKey)
			r.Header.Del("Accept-Encoding") // Prevent compression issues during debugging

			log.Printf("➡️  Redirecting to: %s%s", targetURL, r.URL.Path)

			return r, nil
		})

	log.Println("🚀 Zaps Connect Proxy listening on :8888")

	server := &http.Server{
		Addr:    ":8888",
		Handler: proxy,
	}

	// Run server in goroutine
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", err)
		}
	}()

	// Wait for context cancellation
	<-ctx.Done()

	// Shutdown gracefully
	log.Println("🛑 Stopping Zaps Connect Proxy...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatal("Server Shutdown:", err)
	}
	log.Println("✅ Proxy stopped")
}
