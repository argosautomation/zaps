#!/bin/bash
set -e

BASE_URL="http://localhost:3000"
# Use existing cookies if available, else login again
if [ ! -f cookies.txt ]; then
    echo "⚠️  No cookies found. Run verify.sh first to login."
    exit 1
fi

echo "🔹 1. Listing Providers (Should be empty/unconfigured)"
LIST_RES=$(curl -s -b cookies.txt -X GET "$BASE_URL/api/dashboard/providers")
echo "Response: $LIST_RES"

echo "🔹 2. Configuring DeepSeek Key"
# Using a dummy key for test, or the one from env if we parsed it. 
# Let's use a dummy test key that we know isn't the system one.
TEST_KEY="sk-test-user-key-12345"
CONFIG_RES=$(curl -s -b cookies.txt -X POST "$BASE_URL/api/dashboard/providers" \
  -H "Content-Type: application/json" \
  -d "{\"provider\":\"deepseek\",\"key\":\"$TEST_KEY\"}")
echo "Response: $CONFIG_RES"

echo "🔹 3. Verifying Configuration"
LIST_RES_2=$(curl -s -b cookies.txt -X GET "$BASE_URL/api/dashboard/providers")
echo "Response: $LIST_RES_2"

# Check if deepseek is configured
if [[ $LIST_RES_2 == *"\"provider\":\"deepseek\",\"configured\":true"* ]]; then
   echo "✅ DeepSeek configured successfully"
else
   echo "❌ DeepSeek configuration failed"
   exit 1
fi

echo "🔹 4. Testing Proxy Access (Mocking a request)"
# We need a valid gk_ key. Let's list keys to find one.
KEYS_RES=$(curl -s -b cookies.txt -X GET "$BASE_URL/api/dashboard/keys")
GK_KEY=$(echo $KEYS_RES | sed -n 's/.*"key":"\([^"]*\)".*/\1/p')

if [ -z "$GK_KEY" ]; then
    echo "⚠️  No API Key found. Creating one..."
    CREATE_RES=$(curl -s -b cookies.txt -X POST "$BASE_URL/api/dashboard/keys" \
        -H "Content-Type: application/json" \
        -d '{"name":"Provider Test Key"}')
    GK_KEY=$(echo $CREATE_RES | sed -n 's/.*"key":"\([^"]*\)".*/\1/p')
fi

echo "Using Gateway Key: $GK_KEY"

# Make a request to the proxy
# This might fail upstream if the key is fake, but we want to see if the Gateway TRIES to use it.
# We can't easily see internal logs from here without tails, but response might be 401 from DeepSeek (good) vs 500 (bad).
PROXY_RES=$(curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "Authorization: Bearer $GK_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "Hello"}]
  }')

echo "Proxy Response: $PROXY_RES"
# If we sent a fake key, DeepSeek should return 401. 
# If Gateway logic failed, we might get 500 or "Provider not configured".

echo "🔹 5. Deleting Configuration"
DEL_RES=$(curl -s -b cookies.txt -X DELETE "$BASE_URL/api/dashboard/providers/deepseek")
echo "Response: $DEL_RES"

echo "🎉 PROVIDER VERIFICATION COMPLETE"
