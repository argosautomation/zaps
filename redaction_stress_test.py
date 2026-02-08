#!/usr/bin/env python3
"""
Zaps.ai Gateway - Redaction Stress Test
Tests 100 messages with random PII to verify redaction/rehydration accuracy.
Uses standard library only (no pip install required).
"""

import urllib.request
import urllib.error
import json
import random
import string
import time
from datetime import datetime

# Configuration
GATEWAY_URL = "http://localhost:3000/v1/chat/completions"
API_KEY = "gk_TEST_KEY_123"  # Manual Stress Test key

def random_email():
    names = ["alice", "bob", "charlie", "david"]
    domains = ["gmail.com", "zaps.ai", "test.com"]
    return f"{random.choice(names)}{random.randint(100,999)}@{random.choice(domains)}"

def random_phone():
    return f"{random.randint(200,999)}-{random.randint(200,999)}-{random.randint(1000,9999)}"

def random_api_key():
    chars = string.ascii_letters + string.digits + "-_"
    return "sk-" + ''.join(random.choices(chars, k=32))

def random_credit_card():
    return f"{random.randint(4000,4999)} {random.randint(1000,9999)} {random.randint(1000,9999)} {random.randint(1000,9999)}"

def generate_test_message():
    pii_type = random.choice(["phone", "api_key", "email"])
    
    if pii_type == "phone":
        secret = random_phone()
        type_name = "phone number"
    elif pii_type == "api_key":
        secret = random_api_key()
        type_name = "API key"
    else:
        secret = random_email()
        type_name = "email address"

    msg = f"I am testing a privacy filter. I sent you this {type_name}: {secret}. It was replaced by a placeholder token. Please reply with ONLY that specific placeholder token string."
    
    return pii_type, secret, msg

def post_request(url, data, headers):
    req = urllib.request.Request(
        url, 
        data=json.dumps(data).encode('utf-8'), 
        headers=headers, 
        method='POST'
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            return response.getcode(), response.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')
    except Exception as e:
        return 0, str(e)

def test_redaction(test_id, pii_type, secret, message):
    payload = {
        "model": "deepseek-chat",
        "messages": [{"role": "user", "content": message}],
        "max_tokens": 100
    }
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }

    status_code, response_body = post_request(GATEWAY_URL, payload, headers)
    
    if status_code != 200:
        return {
            "id": test_id,
            "status": "❌ FAIL",
            "pii_type": pii_type,
            "original": message,
            "secret": secret,
            "response_status": status_code,
            "response": response_body[:100],
            "rehydrated": False
        }
    
    try:
        data = json.loads(response_body)
        ai_response = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    except:
        ai_response = response_body
        
    # Check rehydration (secret should appear in response)
    rehydrated = secret in ai_response
    
    # Heuristic: if response contains <SECRET: token, it FAILED rehydration.
    failed_rehydration = "<SECRET:" in ai_response
    
    if failed_rehydration:
        status = "❌ FAIL (Token Leaked)"
    elif rehydrated:
        status = "✅ PASS"
    else:
        status = "⚠️  WARN (No Confirmation)"

    return {
        "id": test_id,
        "status": status,
        "pii_type": pii_type,
        "original": message,
        "secret": secret,
        "response": ai_response.strip(),
        "rehydrated": rehydrated
    }

def main():
    print("=" * 80)
    print("Zaps.ai Gateway - Redaction Stress Test")
    print("=" * 80)
    print(f"Time: {datetime.now().strftime('%H:%M:%S')}")
    print(f"Target: {GATEWAY_URL}")
    print(f"Total Tests: 10")
    print("=" * 80)
    print()
    
    results = []
    
    for i in range(1, 11):
        pii_type, secret, message = generate_test_message()
        print(f"Test #{i:<2} Type: {pii_type:<10} Secret: {secret:<35}", end="", flush=True)
        
        result = test_redaction(i, pii_type, secret, message)
        results.append(result)
        
        print(f" -> {result['status']}")
        
        # Rate limiting kindness
        time.sleep(1)

    print()
    print("=" * 80)
    print("DETAILED FAILURES / WARNINGS")
    print("=" * 80)
    
    has_issues = False
    for r in results:
        if r['status'] != "✅ PASS":
            has_issues = True
            print(f"Test #{r['id']} - {r['status']}")
            print(f"  Type:     {r['pii_type']}")
            print(f"  Secret:   {r['secret']}")
            print(f"  AI Resp:  {r['response']}")
            print("-" * 60)
            
    if not has_issues:
        print("🎉 No failures or warnings! 100% Success.")
        
    passed = sum(1 for r in results if r['status'] == "✅ PASS")
    print("\nSummary:")
    print(f"Passed: {passed}/10")

if __name__ == "__main__":
    main()
