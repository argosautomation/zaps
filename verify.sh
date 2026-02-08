#!/bin/bash
set -e

BASE_URL="http://localhost:3000"
EMAIL="test_${RANDOM}@zaps.ai"
PASSWORD="Password123!"

echo "🔹 1. Registering user: $EMAIL"
REGISTER_RES=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"org_name\":\"Test Org\"}")
echo "Response: $REGISTER_RES"

# Extract User ID (simple grep/sed, assuming JSON structure)
USER_ID=$(echo $REGISTER_RES | sed -n 's/.*"user_id":"\([^"]*\)".*/\1/p')

if [ -z "$USER_ID" ]; then
  echo "❌ Failed to get User ID"
  exit 1
fi
echo "✅ User ID: $USER_ID"

echo "🔹 2. Getting Verification Token from DB"
TOKEN=$(psql -d zaps -t -c "SELECT verification_token FROM users WHERE email='$EMAIL'" | xargs)
echo "✅ Token: $TOKEN"

echo "🔹 3. Verifying Email"
VERIFY_RES=$(curl -s -X GET "$BASE_URL/auth/verify?token=$TOKEN")
echo "Response: $VERIFY_RES"

echo "🔹 4. Logging In"
# We need to save cookies
curl -s -c cookies.txt -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" > login_response.json
echo "Response: $(cat login_response.json)"

echo "🔹 5. Creating API Key"
CREATE_KEY_RES=$(curl -s -b cookies.txt -X POST "$BASE_URL/api/dashboard/keys" \
  -H "Content-Type: application/json" \
  -d '{"name":"Verification Key"}')
echo "Response: $CREATE_KEY_RES"

# Check if key starts with gk_
KEY_VAL=$(echo $CREATE_KEY_RES | sed -n 's/.*"key":"\([^"]*\)".*/\1/p')
if [[ $KEY_VAL == gk_* ]]; then
   echo "✅ Created valid key prefix"
else
   echo "❌ Key creation failed or invalid format"
   exit 1
fi

echo "🔹 6. Listing API Keys"
LIST_RES=$(curl -s -b cookies.txt -X GET "$BASE_URL/api/dashboard/keys")
echo "Response: $LIST_RES"

echo "🔹 7. Getting Dashboard Stats"
STATS_RES=$(curl -s -b cookies.txt -X GET "$BASE_URL/api/dashboard/stats")
echo "Response: $STATS_RES"

echo "🎉 VERIFICATION COMPLETE"
