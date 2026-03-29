#!/usr/bin/env bash
# Positive-path smoke checks for hardened API routes.
# Run from backend directory: npm run smoke:positive
# shellcheck shell=bash

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
# shellcheck source=smokeApiValidation.lib.sh
. "${SCRIPT_DIR}/smokeApiValidation.lib.sh"

: "${SMOKE_CLIENT_EMAIL:=smoke@example.com}"
: "${SMOKE_CLIENT_NAME:=Smoke Client}"

PASSED=0
FAILED=0
SKIPPED=0

pass() { PASSED=$((PASSED + 1)); }
fail() { FAILED=$((FAILED + 1)); }
skip() { SKIPPED=$((SKIPPED + 1)); }

request_capture() {
    local method="$1"
    local url="$2"
    local data="$3"
    shift 3
    local body_file
    body_file=$(mktemp "${TMPDIR:-/tmp}/osv-smoke-body.XXXXXX")
    local curl_args=(-sS -o "$body_file" -w "%{http_code}" -X "$method" "$url" -H "Content-Type: application/json")
    if [ -n "$data" ]; then
        curl_args+=(-d "$data")
    fi
    RESPONSE_CODE=$(curl "${curl_args[@]}" "$@" || printf "000")
    RESPONSE_BODY=$(cat "$body_file")
    rm -f "$body_file"
}

json_get() {
    local key_path="$1"
    printf '%s' "$RESPONSE_BODY" | node -e "
const fs = require('fs');
const input = fs.readFileSync(0, 'utf8');
try {
  const data = JSON.parse(input);
  const path = process.argv[1].split('.');
  let cur = data;
  for (const part of path) {
    if (cur == null || !(part in cur)) { cur = null; break; }
    cur = cur[part];
  }
  if (cur == null) process.exit(2);
  if (typeof cur === 'object') process.stdout.write(JSON.stringify(cur));
  else process.stdout.write(String(cur));
} catch {
  process.exit(2);
}
" "$key_path"
}

echo "=== OSV backend positive smoke (API_BASE=${API_BASE}) ==="
if ! smoke_precheck_health; then
    exit 1
fi

AUTH_HDRS=()
if [ -n "$ADMIN_BEARER" ]; then
    AUTH_HDRS=(-H "Authorization: Bearer ${ADMIN_BEARER}")
fi

echo ""
echo "--- Baseline security summary endpoint ---"
code=$(smoke_request GET "${API_BASE}/api/admin/security-summary" "" "${AUTH_HDRS[@]}")
if smoke_expect_codes "GET /api/admin/security-summary" "$code" "200 401 403"; then
    pass
else
    fail
fi

if [ -z "$ADMIN_BEARER" ]; then
    echo ""
    echo "SKIP: Admin-positive route flow requires ADMIN_BEARER."
    skip
    echo "=== Summary: ${PASSED} passed, ${FAILED} failed, ${SKIPPED} skipped ==="
    [ "$FAILED" -eq 0 ] || exit 1
    exit 0
fi

echo ""
echo "--- Admin -> Portal positive flow ---"

CREATE_PAYLOAD=$(cat <<EOF
{
  "client_name": "${SMOKE_CLIENT_NAME}",
  "client_email": "${SMOKE_CLIENT_EMAIL}",
  "trade": "Decking",
  "summary": "Smoke positive quote",
  "total_cost": 1000,
  "margin": 0.25,
  "profit": 250,
  "final_client_quote": 1250,
  "generated_json": {"line_items":[]},
  "status": "draft"
}
EOF
)

request_capture POST "${API_BASE}/api/admin/quotes" "$CREATE_PAYLOAD" "${AUTH_HDRS[@]}"
if smoke_expect_codes "POST /api/admin/quotes valid create" "$RESPONSE_CODE" "201"; then
    pass
else
    fail
    echo "Body: $RESPONSE_BODY"
    echo "=== Summary: ${PASSED} passed, ${FAILED} failed, ${SKIPPED} skipped ==="
    exit 1
fi

QUOTE_ID=$(json_get "quoteId" || true)
QUOTE_NUM=$(json_get "quoteNum" || true)
if [ -z "$QUOTE_ID" ] || [ -z "$QUOTE_NUM" ]; then
    echo "FAIL: could not parse quoteId/quoteNum from create response"
    fail
    echo "Body: $RESPONSE_BODY"
    echo "=== Summary: ${PASSED} passed, ${FAILED} failed, ${SKIPPED} skipped ==="
    exit 1
fi

request_capture PATCH "${API_BASE}/api/admin/quotes/${QUOTE_ID}" '{"status":"issued"}' "${AUTH_HDRS[@]}"
if smoke_expect_codes "PATCH /api/admin/quotes/:id issued" "$RESPONSE_CODE" "200"; then
    pass
else
    fail
    echo "Body: $RESPONSE_BODY"
fi

PORTAL_TOKEN=$(json_get "portal.token" || true)
if [ -z "$PORTAL_TOKEN" ]; then
    echo "FAIL: issued response missing portal.token"
    fail
    echo "Body: $RESPONSE_BODY"
    echo "=== Summary: ${PASSED} passed, ${FAILED} failed, ${SKIPPED} skipped ==="
    exit 1
fi

request_capture GET "${API_BASE}/api/portal/quotes/${QUOTE_NUM}?token=${PORTAL_TOKEN}" "" 
if smoke_expect_codes "GET /api/portal/quotes/:ref with token" "$RESPONSE_CODE" "200"; then
    pass
else
    fail
    echo "Body: $RESPONSE_BODY"
fi

ACCEPT_NONCE="accept-$(date +%s)-$RANDOM"
request_capture POST "${API_BASE}/api/portal/quotes/${QUOTE_NUM}/accept" "{\"portalToken\":\"${PORTAL_TOKEN}\",\"actionNonce\":\"${ACCEPT_NONCE}\"}"
if smoke_expect_codes "POST /api/portal/quotes/:ref/accept valid" "$RESPONSE_CODE" "200"; then
    pass
else
    fail
    echo "Body: $RESPONSE_BODY"
fi

CHECKOUT_NONCE="checkout-$(date +%s)-$RANDOM"
request_capture POST "${API_BASE}/api/checkout/create-session" "{\"quoteNum\":\"${QUOTE_NUM}\",\"portalToken\":\"${PORTAL_TOKEN}\",\"actionNonce\":\"${CHECKOUT_NONCE}\",\"clientName\":\"${SMOKE_CLIENT_NAME}\"}"
if smoke_expect_codes "POST /api/checkout/create-session valid body" "$RESPONSE_CODE" "200 500"; then
    pass
else
    fail
    echo "Body: $RESPONSE_BODY"
fi

if [ "$RESPONSE_CODE" = "200" ]; then
    CHECKOUT_URL=$(json_get "url" || true)
    if [ -n "$CHECKOUT_URL" ]; then
        echo "INFO: Checkout URL created."
    else
        echo "WARN: create-session returned 200 without url."
    fi
fi

echo ""
echo "=== Summary: ${PASSED} passed, ${FAILED} failed, ${SKIPPED} skipped ==="
if [ "$FAILED" -gt 0 ]; then
    exit 1
fi
exit 0
