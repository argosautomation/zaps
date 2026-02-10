# Zaps Connect (Prototype) Documentation

**Status: Functional Prototype (Dev Mode)**
**Date: Feb 10, 2026**

## Overview
Zaps Connect is a lightweight local proxy CLI written in Go. It intercepts traffic on your local machine destined for known LLM providers (e.g., DeepSeek) and transparently routes it through the Zaps.ai Gateway for governance, redaction, and logging.

## Current Capabilities
- **Login**: Securely authenticates via **Device Flow** (RFC 8628) and saves credential to `~/.zaps/credentials`.
- **Proxy**: Runs a local HTTP CONNECT tunnel on port `:8888`.
- **Interception**:
    - Targets: `api.deepseek.com`
    - Action: Rewrites destination to `zaps.ai`.
    - Auth Injection: Automatically adds `Authorization: Bearer gk_...` header.

## How to Run (Source)
Since this is currently a prototype, you run it directly from the Go source code.

### 1. Build/Run
```bash
cd cli
go build -o zaps .
```

### 2. Login (Device Flow)
```bash
./zaps login
# Output:
# Authenticate your device:
# 1. Visit: https://zaps.ai/activate
# 2. Enter Code: ABCD-1234
```
Follow the instructions to authorize the device in your browser. The CLI will automatically save your API Key to `~/.zaps/credentials` upon approval.

### 3. Start Proxy
```bash
./zaps connect
# Output: 🚀 Zaps Connect Proxy listening on :8888
```

### 4. Test (Manual)
To verify it works, use `curl` with the proxy flag:

```bash
curl -v -k -x http://localhost:8888 https://api.deepseek.com/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### 4. Use System-Wide (Optional)
To force terminal tools to use it:
```bash
export HTTP_PROXY=http://localhost:8888
export HTTPS_PROXY=http://localhost:8888
```

## Safety: How to Stop & "Uninstall"
If you lose internet access or want to stop using Zaps:

1. **Stop the Proxy**: Press `Ctrl+C` in the terminal running `zaps connect`.
2. **Unset Proxy Variables** (If you set them):
   ```bash
   unset HTTP_PROXY
   unset HTTPS_PROXY
   ```
3. **Verify**: Run `curl https://google.com` to ensure your connection is back to normal.

## Code Structure
- `cli/main.go`: CLI entry point and `login` command.
- `cli/proxy.go`: Core `goproxy` implementation and interception logic.

## Roadmap (To Do)
- [x] **Device Flow**: Implemented RFC 8628 for secure login.
- [ ] **Binary Build**: Create cross-platform builds (Mac/Linux/Windows).
- [ ] **System Cert**: Automate Root CA installation for transparent SSL handling (no `-k` needed).
- [ ] **Tray App**: Wrap CLI in a lightweight menu bar app.
