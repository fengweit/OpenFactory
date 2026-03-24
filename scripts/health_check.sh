#!/bin/bash
# OpenFactory health check — runs every 30 min via cron
# Requires: SLACK_BOT_TOKEN env var (or set in ~/.openfactory.env)

API="http://localhost:3000"
LOG="/tmp/openfactory-health.log"
SLACK_CHANNEL="C0AHA1P0XS4"
TS=$(date '+%Y-%m-%d %H:%M:%S')

# Load token from env file if not already set
if [ -z "$SLACK_BOT_TOKEN" ] && [ -f "$HOME/.openfactory.env" ]; then
  source "$HOME/.openfactory.env"
fi

send_slack() {
  if [ -n "$SLACK_BOT_TOKEN" ]; then
    curl -s -X POST https://slack.com/api/chat.postMessage \
      -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"channel\":\"$SLACK_CHANNEL\",\"text\":\"$1\"}" > /dev/null
  fi
}

# Check 1: API alive
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$API/health" 2>/dev/null)
if [ "$HEALTH" != "200" ]; then
  MSG="🚨 OpenFactory API DOWN at $TS — GET /health returned $HEALTH. Run: cd ~/Desktop/OpenFactory && npm run api"
  echo "$TS ERROR: $MSG" >> "$LOG"
  send_slack "$MSG"
  exit 1
fi

# Check 2: Quote flow
QUOTE=$(curl -s -X POST "$API/quotes" \
  -H "Content-Type: application/json" \
  -d '{"factory_id":"sz-001","product_description":"health check","quantity":100}' 2>/dev/null)
QID=$(echo "$QUOTE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('quote_id',''))" 2>/dev/null)

if [ -z "$QID" ]; then
  MSG="🚨 OpenFactory QUOTE FLOW BROKEN at $TS — POST /quotes returned no quote_id"
  echo "$TS ERROR: $MSG" >> "$LOG"
  send_slack "$MSG"
  exit 1
fi

echo "$TS OK: health=200 quote=$QID" >> "$LOG"
echo "$TS ✅ OpenFactory healthy"
