import { z } from 'zod';

const QUOTE_STATUSES = [
    'draft',
    'issued',
    'accepted',
    'deposit_paid',
    'won',
    'lost',
    'sent',
    'approved'
];

const EDIT_REASONS = [
    'client_request',
    'scope_change',
    'supplier_update',
    'risk_adjustment',
    'compliance_adjustment',
    'rounding_correction',
    'internal_quality_control',
    'other'
];

const nonEmptyString = z.string().min(1);

/** Admin POST /api/admin/quotes — mirrors existing optional fields and type expectations */
export const createQuoteBodySchema = z
    .object({
        client_name: z.string().optional(),
        client_email: z.union([z.string(), z.null()]).optional(),
        client_addr: z.union([z.string(), z.null()]).optional(),
        client_suburb: z.union([z.string(), z.null()]).optional(),
        client_postcode: z.union([z.string(), z.null()]).optional(),
        trade: z.string().optional(),
        summary: z.string().optional(),
        total_cost: z.number().optional(),
        margin: z.number().optional(),
        profit: z.number().optional(),
        final_client_quote: z.number().optional(),
        generated_json: z.union([z.record(z.string(), z.any()), z.string(), z.null()]).optional(),
        status: z.union([z.enum(QUOTE_STATUSES), z.null()]).optional()
    });

/** Admin PATCH /api/admin/quotes/:id */
export const patchQuoteStatusBodySchema = z.object({
    status: z.union([z.enum(QUOTE_STATUSES), z.null()]).optional()
});

const generatedJsonValue = z.custom(
    (val) => val !== null && val !== undefined && typeof val === 'object',
    { message: 'Expected object' }
);

/** Admin POST /api/admin/quotes/:id/revisions */
export const quoteRevisionBodySchema = z
    .object({
        generated_json: generatedJsonValue,
        summary: z.string().optional(),
        total_cost: z.number().optional(),
        margin: z.number().optional(),
        profit: z.number().optional(),
        final_client_quote: z.number().optional(),
        edit_reason: z.enum(EDIT_REASONS),
        edit_notes: z.union([z.string(), z.null()]).optional(),
        edited_by: z.string().optional(),
        edit_source: z.string().optional()
    });

/** Portal POST accept / decline — only validate types when fields are sent */
export const portalQuoteActionBodySchema = z.object({
    actionNonce: z.union([z.string(), z.null()]).optional(),
    portalToken: z.union([z.string(), z.null()]).optional()
});

const quoteNumField = z.union([
    z.string().min(1),
    z.number().finite().transform((n) => String(n))
]);

/** POST /api/checkout/create-session */
export const checkoutCreateSessionBodySchema = z.object({
    quoteNum: quoteNumField,
    depositAmount: z.number().optional(),
    clientName: z.string().optional(),
    actionNonce: z.union([z.string(), z.null()]).optional(),
    portalToken: z.union([z.string(), z.null()]).optional()
});

/** POST /api/checkout/confirm-payment */
export const checkoutConfirmPaymentBodySchema = z.object({
    quoteNum: quoteNumField,
    sessionId: nonEmptyString,
    actionNonce: z.union([z.string(), z.null()]).optional(),
    portalToken: z.union([z.string(), z.null()]).optional()
});

/** POST /api/webhook/leads */
export const webhookLeadBodySchema = z.object({
    from: z.string().optional(),
    source: z.string().optional(),
    body: z.string().optional(),
    subject: z.string().optional()
});
