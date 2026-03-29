import { z } from 'zod';

export function zodIssuesToDetails(error) {
    if (!(error instanceof z.ZodError)) {
        return [{ path: '', message: String(error) }];
    }
    return error.issues.map((issue) => ({
        path: issue.path.length ? issue.path.map(String).join('.') : '(root)',
        message: issue.message,
        code: issue.code
    }));
}

/**
 * Parse and assign req.body. Use when validation must run after other checks (e.g. webhook secret).
 * @returns {{ ok: true } | { ok: false, details: Array<{path: string, message: string, code?: string}> }}
 */
export function validateBodyInPlace(req, schema) {
    const result = schema.safeParse(req.body === undefined ? {} : req.body);
    if (!result.success) {
        return { ok: false, details: zodIssuesToDetails(result.error) };
    }
    req.body = result.data;
    return { ok: true };
}

/**
 * Express middleware: parse req.body with a Zod schema.
 * On failure: 400 { error: 'Validation failed', details: [...] }
 * On success: replaces req.body with parsed output (stripped/coerced per schema).
 */
export function validateBody(schema) {
    return (req, res, next) => {
        const outcome = validateBodyInPlace(req, schema);
        if (!outcome.ok) {
            return res.status(400).json({
                error: 'Validation failed',
                details: outcome.details
            });
        }
        next();
    };
}
