#!/bin/bash
# ============================================================
# OpenFactory — Qianhai OPC Mavericks Program Demo Script
# Run: bash scripts/qianhai_demo.sh
# Prereq: npm run api running in another terminal
# ============================================================

API="http://localhost:3000"
BOLD="\033[1m"; CYAN="\033[36m"; GREEN="\033[32m"; YELLOW="\033[33m"; RESET="\033[0m"

header() { echo -e "\n${CYAN}${BOLD}▶ $1${RESET}"; }
ok()     { echo -e "  ${GREEN}✓ $1${RESET}"; }
info()   { echo -e "  ${YELLOW}→ $1${RESET}"; }

echo ""
echo -e "${BOLD}┌──────────────────────────────────────────────────────────┐"
echo -e "│          OpenFactory — Live API Demo                     │"
echo -e "│    Stripe for Manufacturing · Built in Qianhai, SZ       │"
echo -e "└──────────────────────────────────────────────────────────┘${RESET}"

# ─── Step 0: Health ─────────────────────────────────────────
header "Step 0: Server Health"
HEALTH=$(curl -s "$API/health")
echo "  $(echo $HEALTH | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Service: {d[\"service\"]} | Tools: {len(d[\"tools\"])} MCP tools')")"
ok "API is live"

# ─── Step 1: Search factories ────────────────────────────────
header "Step 1: search_factories(category=pcb_assembly, verified_only=true)"
FACTORIES=$(curl -s "$API/factories?category=pcb_assembly&verified_only=true")
echo $FACTORIES | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'  Found {d[\"count\"]} verified PCB factories:')
for f in d['factories']:
    print(f'    • {f[\"id\"]:8} {f[\"name\"]:30} {f[\"location\"][\"city\"]:12} MOQ:{f[\"moq\"]} {f[\"rating\"]}★')
"

# ─── Step 2: Get competing quotes ────────────────────────────
header "Step 2: get_quote() from top 2 factories (parallel RFQ)"
Q1=$(curl -s -X POST "$API/quotes" -H "Content-Type: application/json" \
  -d '{"factory_id":"sz-004","product_description":"4-layer PCB for IoT sensor module","quantity":5000,"buyer_id":"demo-buyer"}')
Q2=$(curl -s -X POST "$API/quotes" -H "Content-Type: application/json" \
  -d '{"factory_id":"sz-006","product_description":"4-layer PCB for IoT sensor module","quantity":5000,"buyer_id":"demo-buyer"}')

echo $Q1 | python3 -c "
import sys,json
q=json.load(sys.stdin)
print(f'  Quote 1 ({q[\"factory_id\"]}): \${q[\"unit_price_usd\"]}/pc · Total: \${q[\"total_price_usd\"]:,.0f} · Lead: {q[\"lead_time_days\"]}d')
"
echo $Q2 | python3 -c "
import sys,json
q=json.load(sys.stdin)
print(f'  Quote 2 ({q[\"factory_id\"]}): \${q[\"unit_price_usd\"]}/pc · Total: \${q[\"total_price_usd\"]:,.0f} · Lead: {q[\"lead_time_days\"]}d')
"

# Pick best quote
QID=$(python3 -c "
import json
q1=json.loads('$Q1'.replace(\"'\",\"'\"))
q2=json.loads('$Q2'.replace(\"'\",\"'\"))
best = q1 if q1['unit_price_usd'] < q2['unit_price_usd'] else q2
print(best['quote_id'])
" 2>/dev/null || echo $Q1 | python3 -c "import sys,json; print(json.load(sys.stdin)['quote_id'])")
info "Agent selects cheapest quote: $QID"

# ─── Step 3: Place escrow-protected order ────────────────────
header "Step 3: place_order(quote_id=$QID) — escrow protected"
ORDER=$(curl -s -X POST "$API/orders" -H "Content-Type: application/json" \
  -d "{\"quote_id\":\"$QID\",\"buyer_id\":\"demo-buyer\"}")
OID=$(echo $ORDER | python3 -c "import sys,json; print(json.load(sys.stdin)['order_id'])")
echo $ORDER | python3 -c "
import sys,json
o=json.load(sys.stdin)
print(f'  Order {o[\"order_id\"]}')
print(f'  Factory: {o[\"factory_id\"]} | Qty: {o[\"quantity\"]:,} pcs | Total: \${o[\"total_price_usd\"]:,.0f}')
print(f'  Status: {o[\"status\"]} | Est. ship: {o[\"estimated_ship_date\"]}')
print(f'  💰 Payment held in escrow — released after buyer confirms receipt')
"

# ─── Step 4: Production milestones ───────────────────────────
header "Step 4: update_order_status() — factory advances milestones"
for S in "confirmed" "in_production" "qc"; do
  curl -s -X PATCH "$API/orders/$OID/status" -H "Content-Type: application/json" \
    -d "{\"status\":\"$S\"}" > /dev/null
  ok "$S"
  sleep 0.3
done

# ─── Step 5: Track order ─────────────────────────────────────
header "Step 5: track_order($OID)"
TRACK=$(curl -s "$API/orders/$OID")
echo $TRACK | python3 -c "
import sys,json
o=json.load(sys.stdin)
print(f'  Current status: {o[\"status\"]}')
print(f'  Event history ({len(o[\"events\"])} events):')
for e in o['events']:
    print(f'    [{e[\"created_at\"][:16]}] {e[\"event\"]:20} {e[\"note\"] or \"\"}')
"

# ─── Step 6: Analytics ───────────────────────────────────────
header "Step 6: get_analytics()"
curl -s "$API/analytics" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'  Factories: {d[\"total_factories\"]} ({d[\"verified_factories\"]} verified)')
print(f'  Quotes:    {d[\"total_quotes\"]}')
print(f'  Orders:    {d[\"total_orders\"]}')
print(f'  GMV:       \${d[\"total_gmv\"]:,.0f}')
if d.get('factory_stats'):
    print(f'  Top factories by quote volume:')
    for f in d[\"factory_stats\"][:3]:
        print(f'    • {f[\"factory_id\"]:8} {f[\"quote_count\"]} quotes')
"

# ─── Final summary ───────────────────────────────────────────
echo ""
echo -e "${BOLD}┌──────────────────────────────────────────────────────────┐"
echo -e "│  ✅  Full manufacturing flow completed via API            │"
echo -e "│  🤖  Same flow works from Claude / GPT via MCP tools      │"
echo -e "│  🏭  10 GBA factories · Shenzhen / GZ / Dongguan / Foshan │"
echo -e "│  💬  WeChat notifications on every quote + order event    │"
echo -e "│  🔒  Escrow protection on all orders                      │"
echo -e "└──────────────────────────────────────────────────────────┘${RESET}"
echo ""
echo "  Browser:  open http://localhost:3000"
echo "  Agent UI: open http://localhost:3000/agent.html"
echo "  Admin:    open http://localhost:3000/admin.html"
echo ""
