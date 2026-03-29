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

# Fail fast when API_BASE points at a stack without hardened mounts (common: legacy-only /api/quotes, or wrong port/proxy).
# Call after WEBHOOK_HDRS is initialised (may be empty). Uses SMOKE_PORTAL_REF default.
smoke_precheck_hardened_surface() {
    local code

    code=$(curl -sS -o /dev/null -w "%{http_code}" "${API_BASE}/api/admin/quotes") || code="000"
    if [ "$code" = "404" ]; then
        echo "FAIL: precheck — GET ${API_BASE}/api/admin/quotes -> 404 (admin quotes not mounted here)."
        echo "      This repo expects CRUD at /api/admin/quotes (mutations are not POST /api/quotes — legacy is GET-only)."
        echo "      Point API_BASE at the OSV Construct backend (e.g. JWT_SECRET=... npm start, default port 3001) or your Render URL."
        return 1
    fi
    if [ "$code" = "000" ]; then
        echo "FAIL: precheck — GET ${API_BASE}/api/admin/quotes -> unreachable"
        return 1
    fi
    echo "OK:   precheck — GET /api/admin/quotes -> ${code} (not 404)"

    code=$(smoke_request POST "${API_BASE}/api/checkout/create-session" '{}')
    if [ "$code" = "404" ]; then
        echo "FAIL: precheck — POST /api/checkout/create-session -> 404 (checkout router missing or wrong prefix)."
        return 1
    fi
    if [ "$code" = "500" ]; then
        echo "FAIL: precheck — POST /api/checkout/create-session with {} -> 500 (expected 400 from Zod validation)."
        echo "      Older backends validated after handler logic; upgrade or fix API_BASE."
        return 1
    fi
    case "$code" in
        400) echo "OK:   precheck — POST /api/checkout/create-session {} -> 400" ;;
        429) echo "OK:   precheck — POST /api/checkout/create-session {} -> 429 (rate limited; route exists)" ;;
        *)
            echo "WARN: precheck — POST /api/checkout/create-session {} -> ${code} (expected 400)"
            ;;
    esac

    code=$(smoke_request POST "${API_BASE}/api/portal/quotes/${SMOKE_PORTAL_REF}/accept" '{"actionNonce":true}')
    if [ "$code" = "404" ]; then
        echo "FAIL: precheck — POST ${API_BASE}/api/portal/quotes/.../accept -> 404 (portal accept route missing)."
        return 1
    fi
    case "$code" in
        400) echo "OK:   precheck — POST /api/portal/quotes/:ref/accept invalid body -> 400" ;;
        429) echo "OK:   precheck — portal accept probe -> 429 (rate limited; route exists)" ;;
        *)
            echo "WARN: precheck — portal accept probe -> ${code} (expected 400 for invalid actionNonce type)"
            ;;
    esac

    code=$(smoke_request POST "${API_BASE}/api/webhook/leads" '{"from":123,"body":456}' "${WEBHOOK_HDRS[@]}")
    case "$code" in
        200)
            echo "FAIL: precheck — POST /api/webhook/leads with invalid types -> 200 (expected 400 or 403)."
            echo "      Backend is likely pre-Zod webhook validation; upgrade or fix API_BASE."
            return 1
            ;;
        400|403) echo "OK:   precheck — POST /api/webhook/leads invalid types -> ${code}" ;;
        429) echo "OK:   precheck — webhook probe -> 429 (rate limited; route exists)" ;;
        *)
            echo "WARN: precheck — POST /api/webhook/leads probe -> ${code} (expected 400 or 403)"
            ;;
    esac

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
