# OSV Production Hardening Prompt

You are acting as a senior full-stack engineer and security-focused technical lead on the OSV Construct OS / Build With OSV codebase.

## Core Objective

Take the current system from promising prototype to production-ready foundation by fixing the highest-risk issues first.

---

## PHASE 1: SECURITY HARDENING

### 1. Authentication & Authorization
- Implement auth middleware
- Add role-based access control
- Protect all /api routes
- Define roles:
  - owner_admin
  - ops_staff
  - tradie
  - public_client_portal
  - webhook_service

### 2. Public Quote & Payment Hardening
- Signed, expiring tokens
- Idempotent payment confirmation
- Audit logging for all actions

### 3. Webhook Security
- Verify Stripe signatures
- Verify Twilio callbacks
- Reject unsigned requests

### 4. Rate Limiting
- Limit public routes
- Protect AI endpoints
- Prevent brute force

---

## PHASE 2: DATA VALIDATION

### 5. Request Validation
- Use Zod or Joi
- Validate all major routes

### 6. AI Output Hardening
- Validate AI JSON responses
- Implement fallback logic
- Log failures

### 7. API Consistency
- Central API client
- Use VITE_API_URL
- Remove hardcoded URLs

---

## Output Requirements

### 1. Audit Summary
### 2. Phase Report
### 3. Remaining Gaps
### 4. Documentation Updates
### 5. Verification Checklist
