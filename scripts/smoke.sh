#!/usr/bin/env bash
set -eu

BASE="http://dev-vm:3000"
COOKIE="/tmp/nt_smoke_cookies.txt"
rm -f "$COOKIE"
EMAIL="smoke-$(date +%s)@test.com"

echo "=== 1. register ($EMAIL) ==="
curl -sf -c "$COOKIE" -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"password123\",\"name\":\"Smoke\"}" >/dev/null

echo "=== 2. login ==="
curl -sf -c "$COOKIE" -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"password123\"}" >/dev/null

echo "=== 3. me (auth cookie) ==="
curl -sf -b "$COOKIE" "$BASE/api/auth/me" | grep -q '"user"'

echo "=== 4. foods list (seeded) ==="
curl -sf -b "$COOKIE" "$BASE/api/foods" | grep -q '"foods"'

echo "=== 5. create food ==="
FID=$(curl -sf -b "$COOKIE" -X POST "$BASE/api/foods" \
  -H 'Content-Type: application/json' \
  -d '{"name":"SmokeFood","calories":100}' | python3 -c "import sys,json;print(json.load(sys.stdin)['food']['id'])")
[ -n "$FID" ]

echo "=== 6. create log ==="
curl -sf -b "$COOKIE" -X POST "$BASE/api/logs" \
  -H 'Content-Type: application/json' \
  -d "{\"foodId\":\"$FID\",\"quantity\":1,\"mealType\":\"lunch\"}" >/dev/null

echo "=== 7. logs by date ==="
curl -sf -b "$COOKIE" "$BASE/api/logs?date=$(date +%F)" | grep -q '"logs"'

echo "=== 8. goal ==="
curl -sf -b "$COOKIE" "$BASE/api/goal" | grep -q '"goal"'

echo "=== 9. page load (JS bundle reachable) ==="
curl -sf "$BASE/dashboard" | grep -q "Nutrition Tracker"

echo "=== ALL SMOKE CHECKS PASSED ==="
