#!/usr/bin/env bash
# Lightweight API smoke checks for validation-hardened routes.
# Run from backend directory: npm run smoke:validation
# shellcheck shell=bash
# Note: avoid `set -u` here — empty ADMIN_EXTRA/Webhook header arrays break "${arr[@]}" expansion.

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
# shellcheck source=smokeApiValidation.lib.sh
. "${SCRIPT_DIR}/smokeApiValidation.lib.sh"

PASSED=0
FAILED=0

pass() {
    PASSED=$((PASSED + 1))
}

fail() {
    FAILED=$((FAILED + 1))
}

run_case() {
    local name="$1"
    local method="$2"
    local path="$3"
    local body="$4"
    local allowed="$5"
    shift 5
    local url="${API_BASE}${path}"
    local code
    code=$(smoke_request "$method" "$url" "$body" "$@")
    if smoke_expect_codes "$name" "$code" "$allowed"; then
        pass
    else
        fail
    fi
}

echo "=== OSV backend validation smoke (API_BASE=${API_BASE}) ==="
if ! smoke_precheck_health; then
    exit 1
fi

ADMIN_EXTRA=()
if [ -n "$ADMIN_BEARER" ]; then
    ADMIN_EXTRA=(-H "Authorization: Bearer ${ADMIN_BEARER}")
fi

WEBHOOK_HDRS=()
if [ -n "$SMOKE_WEBHOOK_SECRET" ]; then
    WEBHOOK_HDRS=(-H "x-osv-webhook-secret: ${SMOKE_WEBHOOK_SECRET}")
fi

echo ""
echo "--- Admin quote validation (400 = invalid payload; 401 = auth before validation) ---"
run_case "POST /api/admin/quotes invalid status enum" POST "/api/admin/quotes" \
    '{"status":"__not_a_valid_status__"}' "400 401" "${ADMIN_EXTRA[@]}"

run_case "PATCH /api/admin/quotes/:id invalid status" PATCH "/api/admin/quotes/${SMOKE_QUOTE_ID}" \
    '{"status":"bogus"}' "400 401" "${ADMIN_EXTRA[@]}"

run_case "POST /api/admin/quotes/:id/revisions missing required fields" POST "/api/admin/quotes/${SMOKE_QUOTE_ID}/revisions" \
    '{}' "400 401" "${ADMIN_EXTRA[@]}"

echo ""
echo "--- Portal accept body validation ---"
run_case "POST /api/portal/quotes/:ref/accept bad actionNonce type" POST "/api/portal/quotes/${SMOKE_PORTAL_REF}/accept" \
    '{"actionNonce":true}' "400"

echo ""
echo "--- Checkout body validation ---"
run_case "POST /api/checkout/create-session missing quoteNum" POST "/api/checkout/create-session" \
    '{}' "400"

run_case "POST /api/checkout/confirm-payment missing sessionId" POST "/api/checkout/confirm-payment" \
    '{"quoteNum":"smoke-missing-session"}' "400"

echo ""
echo "--- Webhook validation ---"
if [ -z "$SMOKE_WEBHOOK_SECRET" ]; then
    echo "NOTE: SMOKE_WEBHOOK_SECRET unset — if ENFORCE_WEBHOOK_SECRET=true, 401 is accepted instead of 400."
fi
run_case "POST /api/webhook/leads invalid field types" POST "/api/webhook/leads" \
    '{"from":123,"body":456}' "400 401" "${WEBHOOK_HDRS[@]}"

echo ""
echo "--- Admin security summary ---"
code=$(smoke_request GET "${API_BASE}/api/admin/security-summary" "" "${ADMIN_EXTRA[@]}")
if smoke_expect_codes "GET /api/admin/security-summary" "$code" "200 401 403"; then
    pass
else
    fail
fi

echo ""
echo "=== Summary: ${PASSED} passed, ${FAILED} failed ==="
if [ "$FAILED" -gt 0 ]; then
    echo "Hints:"
    echo "  - Admin routes: set ADMIN_BEARER to a Supabase access JWT when ENFORCE_ADMIN_AUTH=true (otherwise expect 401 on invalid-body cases)."
    echo "  - Webhook: set SMOKE_WEBHOOK_SECRET to match WEBHOOK_SHARED_SECRET when ENFORCE_WEBHOOK_SECRET=true."
    exit 1
fi
exit 0
