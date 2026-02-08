#!/bin/bash
BASE="http://localhost:3000"

echo "Attempting login with test@zaps.ai..."
RESP=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@zaps.ai", "password":"Password123!"}')

echo "Response Body: $RESP"

if echo "$RESP" | grep -q "Invalid credentials"; then
    echo "❌ LOGIN FAILED: Account does not exist or wrong password."
    exit 1
elif echo "$RESP" | grep -q "message\":\"Login successful"; then
    echo "✅ LOGIN SUCCESS"
    exit 0
else
    echo "❓ UNKNOWN RESPONSE"
    exit 1
fi
