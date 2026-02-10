package main

import (
	"log"
	"net/http"

	"github.com/elazarl/goproxy"
)

func startProxy(apiKey string) {
	proxy := goproxy.NewProxyHttpServer()
	proxy.Verbose = true

	// Standard MITM for HTTPS (Note: This will cause certificate warnings in browsers/curl without -k)
	proxy.OnRequest().HandleConnect(goproxy.AlwaysMitm)

	// Intercept requests to DeepSeek
	proxy.OnRequest(goproxy.DstHostIs("api.deepseek.com")).DoFunc(
		func(r *http.Request, ctx *goproxy.ProxyCtx) (*http.Request, *http.Response) {
			log.Printf("🛡️  Zaps Intercept: %s%s", r.Host, r.URL.Path)

			// Rewrite Target to Zaps.ai
			r.URL.Scheme = "https"
			r.URL.Host = "zaps.ai"
			r.Host = "zaps.ai" // Critical for SNI and Host header

			// Adjust Path for OpenAI compatibility
			// DeepSeek: /chat/completions -> Zaps: /v1/chat/completions
			// If already /v1/chat/completions, keep it.
			if r.URL.Path == "/chat/completions" {
				r.URL.Path = "/v1/chat/completions"
			}

			// Inject Zaps API Key
			r.Header.Set("Authorization", "Bearer "+apiKey)
			r.Header.Del("Accept-Encoding") // Prevent compression issues during debugging

			log.Printf("➡️  Redirecting to: https://zaps.ai%s", r.URL.Path)

			return r, nil
		})

	log.Println("🚀 Zaps Connect Proxy listening on :8888")
	// Listen on all interfaces
	log.Fatal(http.ListenAndServe(":8888", proxy))
}
