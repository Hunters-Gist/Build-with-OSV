# Shared defaults and helpers for smokeApiValidation.sh
# shellcheck shell=bash
# Source from repo: osv-construct-os/backend/scripts/smokeApiValidation.sh

: "${API_BASE:=http://127.0.0.1:3001}"
# Strip trailing slash so paths like "${API_BASE}/api/..." never double //
API_BASE="${API_BASE%/}"
: "${ADMIN_BEARER:=}"
: "${SMOKE_WEBHOOK_SECRET:=}"
: "${SMOKE_QUOTE_ID:=00000000-0000-4000-8000-000000000001}"
: "${SMOKE_PORTAL_REF:=smoke-nonexistent-quote-ref}"

# Returns HTTP status code only (stdout).
smoke_request() {
    local method="$1"
    local url="$2"
    local data="$3"
    shift 3
    local tmp
    tmp=$(mktemp "${TMPDIR:-/tmp}/osv-smoke.XXXXXX")
    local code
    local curl_args=( -sS -o "$tmp" -w "%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" )
    if [ -n "$data" ]; then
        curl_args+=( -d "$data" )
    fi
    code=$(curl "${curl_args[@]}" "$@") || code="000"
    rm -f "$tmp"
    printf '%s' "$code"
}

smoke_precheck_health() {
    local code
    code=$(curl -sS -o /dev/null -w "%{http_code}" "${API_BASE}/health") || code="000"
    if [ "$code" != "200" ]; then
        echo "FAIL: precheck — GET ${API_BASE}/health returned ${code} (start the backend or set API_BASE)"
        return 1
    fi
    echo "OK:   precheck — GET /health -> 200"
    return 0
}

# $1 name, $2 actual code, $3 space-separated allowed codes
smoke_expect_codes() {
    local name="$1"
    local actual="$2"
    local allowed="$3"
    local c
    for c in $allowed; do
        if [ "$actual" = "$c" ]; then
            echo "PASS: $name -> HTTP $actual"
            return 0
        fi
    done
    echo "FAIL: $name -> HTTP $actual (expected one of: $allowed)"
    return 1
}
