# XLSX (SheetJS) — risk acceptance

## Vulnerability summary

The backend uses the npm package `xlsx` (SheetJS community build, currently `^0.18.5`) to parse `.xlsx` workbooks. Public advisories have reported issues such as **prototype pollution** and **ReDoS** in this ecosystem; the widely used community package has **no fully patched drop-in replacement** that preserves the same import workflow without a larger engineering change (e.g. switching format to JSON-only, or adopting a different parser with its own trade-offs).

## Why retained

`.xlsx` import is **in production use** for **quote training data**: `src/services/quotes/quoteTrainingImportService.js`, CLI `npm run import:quote-training` (`scripts/importQuoteTrainingData.js`), and admin routes under `/api/admin/quote-training/*` (`src/routes/quoteTrainingAdmin.js`). Removing `xlsx` would break operator workflows unless replaced by another implementation.

## Operational mitigations

- Treat workbooks as **trusted, staff-curated** input only (same trust boundary as other admin training data).
- Do not expose this parser to **untrusted bulk uploads** from the public internet.
- Enforce the existing **20 MB** upload cap (`MAX_UPLOAD_BYTES` in `quoteTrainingImportService.js`); review that limit if new upload surfaces are added.
- Prefer **JSON** for automation where possible; use `.xlsx` only when spreadsheets are the source of truth for internal ops.

## Review

**Next review date:** _YYYY-MM-DD_ (revisit after a patched SheetJS release, a vetted alternative parser, or if quote training import paths change.)
