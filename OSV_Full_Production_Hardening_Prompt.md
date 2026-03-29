# OSV Production Hardening Prompt (FULL VERSION)

You are acting as a senior full-stack engineer and security-focused technical lead on the OSV Construct OS / Build With OSV codebase.

Your job is to perform a production-hardening and architecture-stabilization pass on the existing repository, not a redesign from scratch.

---

## CORE OBJECTIVE

Take the current system from promising prototype to production-ready foundation by fixing the highest-risk issues first:

- missing auth/authz on sensitive routes  
- unsafe public quote/payment flows  
- unverified webhooks  
- mixed frontend API base URL usage  
- weak request validation  
- fragile AI JSON handling  
- inline migrations with swallowed failures  
- low observability  
- heavy synchronous route work  
- inconsistent architecture decisions across docs  
- weak testing coverage  

These are not optional.

---

## PHASE 1: SECURITY HARDENING

### 1. Authentication and Role-Based Authorization

Implement auth middleware and server-side permission checks on all non-public operational routes.

Roles:
- owner_admin  
- ops_staff  
- tradie  
- public_client_portal  
- webhook_service  

Requirements:
- All internal /api routes require authentication  
- Enforce role-level authorization  
- Separate client portal vs internal access  
- Route-level + action-level permissions  

Deliverables:
- Auth middleware  
- Role middleware  
- Route protection  
- Permission matrix  
- Dev seed users  

---

### 2. Public Quote & Payment Hardening

Requirements:
- Signed, expiring, quote-bound tokens  
- Idempotent payment confirmation  
- Replay protection  
- Full audit logging  

Deliverables:
- Token utility  
- Token persistence  
- Idempotent logic  
- Audit logs  

---

### 3. Webhook Security

Requirements:
- Verify Stripe signatures  
- Verify Twilio callbacks  
- Secure all inbound webhooks  
- Idempotent handling  

Deliverables:
- Verification utilities  
- Secure routes  
- Logging  
- Duplicate protection  

---

### 4. Rate Limiting

Requirements:
- Rate limit public routes  
- Protect AI endpoints  
- Prevent brute force  

Deliverables:
- Middleware  
- Config thresholds  

---

## PHASE 2: DATA VALIDATION & CONSISTENCY

### 5. Request Validation

Requirements:
- Use Zod or Joi  
- Validate all major routes  

Deliverables:
- Schemas  
- Middleware  
- Error handling  

---

### 6. AI Output Hardening

Requirements:
- Validate AI JSON  
- Safe parsing + repair  
- Fail closed  
- Log failures  

Deliverables:
- Schema contracts  
- Parsing utilities  
- Logging  

---

### 7. API Consistency

Requirements:
- Single API client  
- Use VITE_API_URL  
- Remove hardcoded URLs  

Deliverables:
- API module  
- Refactor calls  

---

## PHASE 3: DATABASE HARDENING

### 8. Migrations

- Replace inline migrations  
- Add versioning  
- Fail loudly  

---

### 9. Money Handling

- Store integer cents  
- Normalize calculations  

---

### 10. Quote State Machine

- Define canonical lifecycle  
- Remove legacy states  

---

## PHASE 4: OBSERVABILITY & PERFORMANCE

### 11. Logging

- Structured logs  
- Request IDs  
- Event logging  

---

### 12. Async Processing

- Move heavy work off request path  
- Add job queue  

---

### 13. Performance

- Add indexes  
- Optimize queries  
- Add caching  

---

## PHASE 5: TESTING & DOCUMENTATION

### 14. Testing

Cover:
- Auth  
- Permissions  
- Quote flows  
- AI failures  
- Payments  
- Webhooks  

---

### 15. Architecture Documentation

Create:
- canonical-architecture.md  
- production-hardening-checklist.md  
- deployment-and-env.md  

---

## IMPLEMENTATION RULES

- No placeholder code  
- No silent failures  
- Fail closed  
- Validate everything  
- Protect all sensitive data  

---

## OUTPUT FORMAT

1. Audit Summary  
2. Phase Report  
3. Remaining Gaps  
4. Documentation Updates  
5. Verification Checklist  

---

## FIRST TASK

Start with PHASE 1 and PHASE 2 only.

Do not redesign UI.  
Do not add new features.  
Focus on real implementation.

