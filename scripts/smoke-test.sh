#!/usr/bin/env bash
# scripts/smoke-test.sh — Post-deployment health checks
# Usage: STAGING_URL=https://api.drivestream.io bash scripts/smoke-test.sh

set -euo pipefail

BASE_URL="${STAGING_URL:-http://localhost:5000}"
PASS=0
FAIL=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_pass() { echo -e "${GREEN}  ✅ PASS${NC} — $1"; ((PASS++)); }
log_fail() { echo -e "${RED}  ❌ FAIL${NC} — $1"; ((FAIL++)); }
log_info() { echo -e "${YELLOW}  ⏳${NC} $1"; }

check_endpoint() {
  local label="$1"
  local url="$2"
  local expected_status="${3:-200}"

  log_info "Checking $label → $url"
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" || echo "000")

  if [[ "$status" == "$expected_status" ]]; then
    log_pass "$label returned HTTP $status"
  else
    log_fail "$label expected HTTP $expected_status, got $status"
  fi
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  DriveStream API — Smoke Tests"
echo "  Target: $BASE_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Core health check
check_endpoint "Health endpoint"       "$BASE_URL/health"        200

# Expect 401 on protected routes (not 404 or 500)
check_endpoint "Auth guard — vehicles" "$BASE_URL/api/vehicles"  401
check_endpoint "Auth guard — users"    "$BASE_URL/api/users"     401

# Public routes should respond
check_endpoint "Auth routes reachable" "$BASE_URL/api/auth/login" 400  # 400 = body missing, route exists

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  Results: ${GREEN}${PASS} passed${NC}  ${RED}${FAIL} failed${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [[ $FAIL -gt 0 ]]; then
  echo "Smoke tests failed — aborting deployment."
  exit 1
fi

echo "All smoke tests passed ✅"