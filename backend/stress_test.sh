#!/bin/bash
# ============================================================
# Zaps API Stress Test — Compare Zaps tracking vs OpenAI usage
# ============================================================
# 
# This script sends controlled requests through the Zaps API
# and logs the response details (tokens, latency, cost estimate)
# so we can compare against OpenAI's usage dashboard.
#
# Usage: bash stress_test.sh
# ============================================================

ZAPS_KEY="gk_956bd005801197ad3f3de17ccd70cdec"
BASE_URL="https://zaps.ai/v1/chat/completions"
LOG_FILE="/tmp/zaps_stress_test_$(date +%Y%m%d_%H%M%S).log"

# GPT-4o pricing (per 1M tokens)
INPUT_PRICE_PER_M=2.50
OUTPUT_PRICE_PER_M=10.00

TOTAL_REQUESTS=0
TOTAL_INPUT_TOKENS=0
TOTAL_OUTPUT_TOKENS=0
TOTAL_TOKENS=0
ESTIMATED_COST=0

echo "========================================" | tee "$LOG_FILE"
echo "Zaps API Stress Test — $(date)" | tee -a "$LOG_FILE"
echo "Log file: $LOG_FILE" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

send_request() {
    local test_name="$1"
    local payload="$2"
    local request_num="$3"

    TOTAL_REQUESTS=$((TOTAL_REQUESTS + 1))
    
    echo "" | tee -a "$LOG_FILE"
    echo "--- Request #${TOTAL_REQUESTS}: ${test_name} ---" | tee -a "$LOG_FILE"
    
    # Capture full response with timing
    local start_time=$(python3 -c 'import time; print(time.time())')
    
    local response
    response=$(curl -s -w "\n__HTTP_CODE__%{http_code}" \
        -X POST "$BASE_URL" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ZAPS_KEY" \
        -d "$payload" 2>&1)
    
    local end_time=$(python3 -c 'import time; print(time.time())')
    local duration=$(python3 -c "print(f'{${end_time} - ${start_time}:.2f}')")
    
    # Split response body and HTTP code
    local http_code=$(echo "$response" | grep "__HTTP_CODE__" | sed 's/__HTTP_CODE__//')
    local body=$(echo "$response" | sed '/__HTTP_CODE__/d')
    
    echo "  HTTP Status: $http_code" | tee -a "$LOG_FILE"
    echo "  Latency: ${duration}s" | tee -a "$LOG_FILE"
    
    if [ "$http_code" = "200" ]; then
        # Extract token usage from response
        local prompt_tokens=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('usage',{}).get('prompt_tokens',0))" 2>/dev/null || echo "0")
        local completion_tokens=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('usage',{}).get('completion_tokens',0))" 2>/dev/null || echo "0")
        local total_tok=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('usage',{}).get('total_tokens',0))" 2>/dev/null || echo "0")
        local model_used=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('model','unknown'))" 2>/dev/null || echo "unknown")
        local reply=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); c=d['choices'][0]['message']['content']; print(c[:80]+'...' if len(c)>80 else c)" 2>/dev/null || echo "(parse error)")
        
        # Calculate cost for this request
        local cost=$(python3 -c "
input_cost = ${prompt_tokens} * ${INPUT_PRICE_PER_M} / 1_000_000
output_cost = ${completion_tokens} * ${OUTPUT_PRICE_PER_M} / 1_000_000
print(f'{input_cost + output_cost:.6f}')
" 2>/dev/null || echo "0")
        
        echo "  Model: $model_used" | tee -a "$LOG_FILE"
        echo "  Prompt tokens: $prompt_tokens" | tee -a "$LOG_FILE"
        echo "  Completion tokens: $completion_tokens" | tee -a "$LOG_FILE"
        echo "  Total tokens: $total_tok" | tee -a "$LOG_FILE"
        echo "  Est. cost: \$$cost" | tee -a "$LOG_FILE"
        echo "  Reply: $reply" | tee -a "$LOG_FILE"
        
        # Accumulate totals
        TOTAL_INPUT_TOKENS=$((TOTAL_INPUT_TOKENS + prompt_tokens))
        TOTAL_OUTPUT_TOKENS=$((TOTAL_OUTPUT_TOKENS + completion_tokens))
        TOTAL_TOKENS=$((TOTAL_TOKENS + total_tok))
        ESTIMATED_COST=$(python3 -c "print(f'{${ESTIMATED_COST} + ${cost}:.6f}')")
    else
        echo "  ERROR Response: $(echo "$body" | head -c 200)" | tee -a "$LOG_FILE"
    fi
}

# ============================================================
# PHASE 1: Small baseline requests (5x tiny)
# Simulates basic "hello world" traffic
# Expected cost: ~$0.001 each
# ============================================================
echo "" | tee -a "$LOG_FILE"
echo "🔹 PHASE 1: Baseline — 5 small requests" | tee -a "$LOG_FILE"

for i in $(seq 1 5); do
    send_request "Tiny request #$i" '{
        "model": "gpt-4o",
        "messages": [{"role": "user", "content": "Say hello in one word."}],
        "max_tokens": 10
    }'
done

echo "" | tee -a "$LOG_FILE"
echo "📊 Phase 1 Running Total: $TOTAL_REQUESTS requests, $TOTAL_TOKENS tokens, est \$$ESTIMATED_COST" | tee -a "$LOG_FILE"

# ============================================================
# PHASE 2: Medium requests (5x moderate — MoltBot-like)
# Simulates typical MoltBot conversation with context
# Expected cost: ~$0.01 each
# ============================================================
echo "" | tee -a "$LOG_FILE"
echo "🔹 PHASE 2: MoltBot Simulation — 5 medium requests" | tee -a "$LOG_FILE"

MOLTBOT_SYSTEM="You are MoltBot, a helpful AI assistant for managing Telegram integrations. You help users with automation, message routing, and bot configuration. Be concise but thorough."

for i in $(seq 1 5); do
    send_request "MoltBot conversation #$i" "{
        \"model\": \"gpt-4o\",
        \"messages\": [
            {\"role\": \"system\", \"content\": \"$MOLTBOT_SYSTEM\"},
            {\"role\": \"user\", \"content\": \"I need help setting up a Telegram bot that automatically forwards messages from one group to another. Can you explain the steps? Request number $i.\"},
            {\"role\": \"assistant\", \"content\": \"Sure! Here's a quick overview: 1) Create a bot via @BotFather 2) Get the bot token 3) Add the bot to both groups 4) Configure forwarding rules. Would you like detailed steps for any of these?\"},
            {\"role\": \"user\", \"content\": \"Yes, give me the detailed steps for step 3 and 4. Also, how do I handle media messages like photos and videos?\"}
        ],
        \"max_tokens\": 500
    }"
done

echo "" | tee -a "$LOG_FILE"
echo "📊 Phase 2 Running Total: $TOTAL_REQUESTS requests, $TOTAL_TOKENS tokens, est \$$ESTIMATED_COST" | tee -a "$LOG_FILE"

# ============================================================
# PHASE 3: Large requests (3x heavy — big context windows)
# Simulates large conversation histories that MoltBot might accumulate
# This is where cost amplification is most likely
# Expected cost: ~$0.05-0.10 each
# ============================================================
echo "" | tee -a "$LOG_FILE"
echo "🔹 PHASE 3: Large Context — 3 heavy requests" | tee -a "$LOG_FILE"

# Generate a large conversation history (~2000 tokens of context)
LARGE_HISTORY=""
for j in $(seq 1 10); do
    LARGE_HISTORY="${LARGE_HISTORY}{\"role\": \"user\", \"content\": \"Message $j: I have been working on setting up my automation pipeline. The pipeline needs to handle incoming webhooks from multiple sources including Telegram, WhatsApp, and email. Each source has different authentication methods and message formats that need to be normalized. Can you help me design the message normalization layer?\"},"
    LARGE_HISTORY="${LARGE_HISTORY}{\"role\": \"assistant\", \"content\": \"For message $j, I recommend creating a unified MessageEvent interface with fields for: source (telegram/whatsapp/email), sender_id, content, content_type (text/image/video/document), timestamp, and metadata. Each source adapter would implement a normalize() method that converts the raw webhook payload into this standard format. This approach gives you a clean separation of concerns.\"},"
done

for i in $(seq 1 3); do
    send_request "Large context #$i" "{
        \"model\": \"gpt-4o\",
        \"messages\": [
            {\"role\": \"system\", \"content\": \"You are a senior software architect. Provide detailed, production-ready advice.\"},
            ${LARGE_HISTORY}
            {\"role\": \"user\", \"content\": \"Now based on our entire conversation history, give me a comprehensive summary of the architecture we've designed. Include all components, their interactions, and any potential scaling concerns. Be thorough.\"}
        ],
        \"max_tokens\": 1000
    }"
done

echo "" | tee -a "$LOG_FILE"
echo "📊 Phase 3 Running Total: $TOTAL_REQUESTS requests, $TOTAL_TOKENS tokens, est \$$ESTIMATED_COST" | tee -a "$LOG_FILE"

# ============================================================
# PHASE 4: Rapid fire (10x fast small requests)
# Tests if rapid succession causes any double-counting
# ============================================================
echo "" | tee -a "$LOG_FILE"
echo "🔹 PHASE 4: Rapid Fire — 10 quick requests" | tee -a "$LOG_FILE"

for i in $(seq 1 10); do
    send_request "Rapid #$i" '{
        "model": "gpt-4o",
        "messages": [{"role": "user", "content": "Count to 3."}],
        "max_tokens": 20
    }' &
    # Small stagger to avoid overwhelming
    sleep 0.3
done
wait

echo "" | tee -a "$LOG_FILE"
echo "📊 Phase 4 Running Total: $TOTAL_REQUESTS requests, $TOTAL_TOKENS tokens, est \$$ESTIMATED_COST" | tee -a "$LOG_FILE"

# ============================================================
# FINAL SUMMARY
# ============================================================
echo "" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "📋 FINAL STRESS TEST SUMMARY" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "Total Requests Sent: $TOTAL_REQUESTS" | tee -a "$LOG_FILE"
echo "Total Input Tokens:  $TOTAL_INPUT_TOKENS" | tee -a "$LOG_FILE"
echo "Total Output Tokens: $TOTAL_OUTPUT_TOKENS" | tee -a "$LOG_FILE"
echo "Total Tokens:        $TOTAL_TOKENS" | tee -a "$LOG_FILE"
echo "Estimated Cost:      \$$ESTIMATED_COST" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "🔍 COMPARE THESE NUMBERS WITH:" | tee -a "$LOG_FILE"
echo "  1. Zaps Dashboard (zaps.ai/dashboard) — Request count" | tee -a "$LOG_FILE"
echo "  2. OpenAI Usage (platform.openai.com/usage) — Token count & spend" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "If Zaps shows $TOTAL_REQUESTS new requests AND OpenAI shows" | tee -a "$LOG_FILE"
echo "~$TOTAL_TOKENS new tokens, the system is tracking correctly." | tee -a "$LOG_FILE"
echo "If OpenAI shows MORE, there's a leak or amplification bug." | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Full log saved to: $LOG_FILE"
