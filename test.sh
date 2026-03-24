#!/bin/bash
# OpenFactory end-to-end test via REST API
# Usage: ./test.sh
# Requires: REST API running on localhost:3000 (npm run api)

BASE="http://localhost:3000"
echo ""
echo "🏭 OpenFactory — End-to-End Test"
echo "================================="

# 1. Health check
echo ""
echo "1. Health check..."
curl -s "$BASE/" | python3 -m json.tool
echo ""

# 2. Search factories
echo "2. Search factories (electronics_accessories, max_moq=500, verified_only=true)..."
curl -s "$BASE/factories?category=electronics_accessories&max_moq=500&verified_only=true" | python3 -m json.tool
echo ""

# 3. Get quote from sz-005
echo "3. Get quote from sz-005 (800 custom phone cases)..."
QUOTE=$(curl -s -X POST "$BASE/quotes" \
  -H "Content-Type: application/json" \
  -d '{"factory_id":"sz-005","product_description":"custom branded phone cases","quantity":800}')
echo $QUOTE | python3 -m json.tool

QUOTE_ID=$(echo $QUOTE | python3 -c "import sys,json; print(json.load(sys.stdin)['quote_id'])")
echo "→ Quote ID: $QUOTE_ID"
echo ""

# 4. Place order
echo "4. Place order using quote $QUOTE_ID..."
ORDER=$(curl -s -X POST "$BASE/orders" \
  -H "Content-Type: application/json" \
  -d "{\"quote_id\":\"$QUOTE_ID\",\"buyer_id\":\"test-buyer-001\"}")
echo $ORDER | python3 -m json.tool

ORDER_ID=$(echo $ORDER | python3 -c "import sys,json; print(json.load(sys.stdin)['order_id'])")
echo "→ Order ID: $ORDER_ID"
echo ""

# 5. Track order
echo "5. Track order $ORDER_ID..."
curl -s "$BASE/orders/$ORDER_ID" | python3 -m json.tool
echo ""

echo "================================="
echo "✅ Test complete"
echo ""
echo "Verify:"
echo "  - factories returned for search"
echo "  - quote has unit_price_usd, total_price_usd, lead_time_days"
echo "  - order has escrow_held: true, status: pending"
echo "  - track returns same order"
