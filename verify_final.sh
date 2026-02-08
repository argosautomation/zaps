#!/bin/bash
BASE="http://localhost:3000"

# 1. Create Key
echo "Creating Key..."
KEY_JSON=$(curl -s -b cookies.txt -X POST "$BASE/api/dashboard/keys" \
  -H "Content-Type: application/json" \
  -d '{"name":"Proxy Test Final"}')
echo "Create Resp: $KEY_JSON"

# Extract key using reliable sed
GK_KEY=$(echo $KEY_JSON | sed -n 's/.*"key":"\([^"]*\)".*/\1/p')
echo "GK_KEY: $GK_KEY"

if [ -z "$GK_KEY" ]; then 
    echo "❌ Failed to create key"
    exit 1
fi

# 2. Configure Provider (Fake Key)
echo "Configuring Provider..."
curl -s -b cookies.txt -X POST "$BASE/api/dashboard/providers" \
  -H "Content-Type: application/json" \
  -d '{"provider":"deepseek","key":"sk-fake-key-for-testing-123"}'

# 3. Call Proxy
echo "Calling Proxy..."
RESP=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE/v1/chat/completions" \
  -H "Authorization: Bearer $GK_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "deepseek-chat", "messages": [{"role": "user", "content": "Hi"}]}')

echo "Response Body:"
echo "$RESP"

# Identify failure source
if echo "$RESP" | grep -q "Authentication failed"; then
    echo "✅ SUCCESS: DeepSeek Upstream rejected the fake key (Proof of connection)"
elif echo "$RESP" | grep -q "Insufficient Balance"; then
    echo "✅ SUCCESS: DeepSeek Upstream rejected the fake key (Proof of connection)"
elif echo "$RESP" | grep -q "Invalid API Key"; then
     # This is likely Gateway error if GK_KEY is bad
     echo "❌ FAILURE: Gateway rejected our GK Key"
elif echo "$RESP" | grep -q "HTTP_CODE:401"; then
     echo "✅ SUCCESS: Upstream returned 401 (Assuming DeepSeek msg)"
else
     echo "❓ ANALYSIS REQUIRED"
fi
