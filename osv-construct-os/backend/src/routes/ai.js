import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import db from '../db/index.js';

const router = express.Router();
const anthropic = new Anthropic({
    apiKey: process.env.OPENROUTER_API_KEY || 'missing_key',
    baseURL: 'https://openrouter.ai/api',
    defaultHeaders: {
        "HTTP-Referer": "https://osv-saa-s.vercel.app",
        "X-Title": "Build With OSV"
    }
});

function getMargin(riskLevel) {
    const risk = (riskLevel || '').toLowerCase();
    if (risk.includes('low')) return 0.20;
    if (risk.includes('high')) return 0.35;
    return 0.25; // medium default
}

function parseBase64Image(dataUrl) {
    if (!dataUrl) return null;
    const matches = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.*)$/);
    if (!matches || matches.length !== 3) {
        if (!dataUrl.startsWith('data:')) {
            return { media_type: 'image/jpeg', data: dataUrl };
        }
        return null;
    }
    return {
        media_type: matches[1],
        data: matches[2]
    };
}

function formatScopeForAI(body) {
    const { job_type, subcategory, scope, description, site_notes, dimensions } = body;
    let text = `Job Type: ${job_type || 'Not specified'}`;
    if (subcategory) text += `\nSubcategory: ${subcategory}`;
    if (dimensions) text += `\nDimensions: ${dimensions}`;
    if (scope && typeof scope === 'object') {
        text += '\n\n--- Trade-Specific Scope Details ---';
        for (const [key, value] of Object.entries(scope)) {
            if (value === '' || value === null || value === undefined) continue;
            if (Array.isArray(value) && value.length === 0) continue;
            if (value === false) continue;
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            const display = Array.isArray(value) ? value.join(', ') : value === true ? 'Yes' : String(value);
            text += `\n${label}: ${display}`;
        }
    }
    if (description) text += `\n\nDescription: ${description}`;
    if (site_notes) text += `\nSite Notes: ${site_notes}`;
    return text;
}

const SYSTEM_PROMPT = `You are a master construction estimator for Build With OSV, a Melbourne-based trades business.
Generate a highly detailed and hyper-realistic quote based on the job type, description, dimensions, and site notes provided. 
Break items down into Labour, Materials, and Disposal.
Evaluate the risk level of the job based on complexity, access, and unknowns (pick one: "Low", "Medium", "High").
Return JSON strictly in this exact format, with NO markdown formatting, just raw JSON:
{
  "line_items": [
    { "category": "Labour|Materials|Disposal", "name": "...", "description": "...", "qty": 1, "unit": "m2|hrs|item", "unit_price": 100, "total": 100 }
  ],
  "scope_summary": "...",
  "exclusions": ["..."],
  "estimated_days": 2,
  "flags": ["..."],
  "risk_level": "Low|Medium|High"
}`;

router.post('/determine-images', async (req, res) => {
    try {
        const { job_type, description, dimensions, site_notes } = req.body;
        
        if (process.env.OPENROUTER_API_KEY === 'dummy_key_for_now' || !process.env.OPENROUTER_API_KEY) {
            return res.status(500).json({ error: 'Please update OPENROUTER_API_KEY in backend/.env with your valid key to use the live AI engine.' });
        }

        const systemPrompt = `You are a master construction estimator. Given a job scope, determine what photos you need from the site to provide an accurate quote. You must ask for exactly 5 mandatory photos. You may optionally request up to 2 additional non-mandatory photos (i.e., "mandatory": false), unless the job is highly complex where you may ask for more optional ones.
Return ONLY valid JSON in this exact format:
{
  "required_images": [
    { "title": "...", "description": "...", "mandatory": true }
  ]
}`;
        const userPrompt = `Job Type: ${job_type}\nDimensions: ${dimensions}\nDescription: ${description}\nSite Notes: ${site_notes}\nGenerate the required images JSON.`;

        const msg = await anthropic.messages.create({
            model: "openai/gpt-5.4",
            max_tokens: 1000,
            temperature: 0.2,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }]
        });
        
        let rawResponse = msg.content[0].text;
        rawResponse = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const result = JSON.parse(rawResponse);
        res.json({ success: true, data: result });
    } catch (err) {
        console.error("Determine Images API Error:", err);
        res.status(500).json({ error: 'Failed to determine required images.' });
    }
});

router.post('/qualifying-questions', async (req, res) => {
    try {
        const { images } = req.body;
        
        if (process.env.OPENROUTER_API_KEY === 'dummy_key_for_now' || !process.env.OPENROUTER_API_KEY) {
            return res.status(500).json({ error: 'Please update OPENROUTER_API_KEY in backend/.env with your valid key to use the live AI engine.' });
        }

        const scopeFormatted = formatScopeForAI(req.body);

        const systemPrompt = `You are a master construction estimator. Review the job details (including trade-specific scope fields) and the provided site photos. Formulate 3 to 5 qualifying questions you still need answered by the client to provide a highly accurate and reliable quote. Ask about specific things you noticed in the photos or crucial details missing from the scope.
Return ONLY valid JSON in this exact format:
{
  "questions": [
    { "id": "q1", "text": "...", "type": "text" }
  ]
}`;
        
        const content = [];
        
        if (images && Array.isArray(images)) {
            images.forEach(imgDataUrl => {
                const parsed = parseBase64Image(imgDataUrl);
                if (parsed) {
                    content.push({
                        type: "image",
                        source: {
                            type: "base64",
                            media_type: parsed.media_type,
                            data: parsed.data
                        }
                    });
                }
            });
        }
        
        content.push({
            type: "text",
            text: `${scopeFormatted}\n\nGenerate the qualifying questions JSON.`
        });

        const msg = await anthropic.messages.create({
            model: "openai/gpt-5.4",
            max_tokens: 1000,
            temperature: 0.2,
            system: systemPrompt,
            messages: [{ role: "user", content }]
        });
        
        let rawResponse = msg.content[0].text;
        rawResponse = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const result = JSON.parse(rawResponse);
        res.json({ success: true, data: result });
    } catch (err) {
        console.error("Qualifying Questions Error:", err);
        res.status(500).json({ error: 'Failed to generate qualifying questions.' });
    }
});

router.post('/generate-quote', async (req, res) => {
    try {
        const { force_manual_pricing, images, qa_responses } = req.body;
        
        if (process.env.OPENROUTER_API_KEY === 'dummy_key_for_now' || !process.env.OPENROUTER_API_KEY) {
            return res.status(500).json({ error: 'Please update OPENROUTER_API_KEY in backend/.env with your valid key to use the live AI engine.' });
        }

        const scopeFormatted = formatScopeForAI(req.body);

        const content = [];
        if (images && Array.isArray(images)) {
            images.forEach(imgDataUrl => {
                const parsed = parseBase64Image(imgDataUrl);
                if (parsed) {
                    content.push({
                        type: "image",
                        source: {
                            type: "base64",
                            media_type: parsed.media_type,
                            data: parsed.data
                        }
                    });
                }
            });
        }
        
        let userPromptText = scopeFormatted + '\n';
        if (qa_responses && qa_responses.length > 0) {
            userPromptText += "\nQualifying Questions & Answers:\n";
            qa_responses.forEach(qa => {
                userPromptText += `Q: ${qa.question}\nA: ${qa.answer}\n`;
            });
        }
        userPromptText += "\nGenerate the highly accurate final quote JSON incorporating the visual evidence, trade-specific scope details, and client answers provided.";
        
        content.push({ type: "text", text: userPromptText });
        
        let anthropicParams = {
            model: "openai/gpt-5.4",
            max_tokens: 2000,
            temperature: 0.2,
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content }]
        };

        if (!force_manual_pricing) {
            anthropicParams.system += `\nYou must act as if you have access to live Bunnings pricing. Add a 10% standard markup to material costs you estimate.`;
        }

        const msg = await anthropic.messages.create(anthropicParams);
        
        let rawResponse = msg.content[0].text;
        rawResponse = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        let generatedQuote;
        try {
             generatedQuote = JSON.parse(rawResponse);
        } catch (e) {
             console.error("AI JSON Parse Error. Raw output:", rawResponse);
             return res.status(500).json({ error: 'AI failed to return valid JSON format.' });
        }

        let subLabour = generatedQuote.line_items.filter(i => i.category === 'Labour').reduce((acc, i) => acc + i.total, 0);
        let matTotal = generatedQuote.line_items.filter(i => i.category === 'Materials' || i.category === 'Disposal').reduce((acc, i) => acc + i.total, 0);
        
        let totalCost = subLabour + matTotal;
        let marginPct = getMargin(generatedQuote.risk_level);
        let clientQuote = totalCost * (1 + marginPct);
        let profit = clientQuote - totalCost;

        let marginAdjustmentNote = null;
        if (profit < 500) {
            profit = 500;
            clientQuote = totalCost + profit;
            marginPct = profit / totalCost; // Update percentage to reflect absolute profit floor
            marginAdjustmentNote = `Margin adjusted to meet minimum absolute profit threshold of $500.`;
        }

        const gst = clientQuote * 0.10;
        const grandTotal = clientQuote + gst;

        res.status(200).json({
            success: true,
            data: {
                ...generatedQuote,
                financials: {
                    totalCost,
                    marginPct,
                    clientQuote,
                    profit,
                    gst,
                    grandTotal,
                    marginAdjustmentNote
                }
            }
        });
        
    } catch (error) {
        console.error("AI API Error:", error);
        res.status(500).json({ error: 'OpenRouter API failed. Please ensure your OPENROUTER_API_KEY is active in .env', details: error.message });
    }
});

router.post('/classify-scope', async (req, res) => {
    try {
        const { photos, job_catalog = [] } = req.body;

        if (!photos || !Array.isArray(photos) || photos.length < 3) {
            return res.status(400).json({ error: 'A minimum of 3 site photos is required for scope classification.' });
        }
        if (photos.length > 5) {
            return res.status(400).json({ error: 'A maximum of 5 photos is allowed.' });
        }

        if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'dummy_key_for_now') {
            return res.status(500).json({ error: 'Please update OPENROUTER_API_KEY in backend/.env to use OSV Vision AI.' });
        }

        const catalog = Array.isArray(job_catalog) ? job_catalog : [];
        const catalogBlock = catalog.length
            ? `\n\n--- AVAILABLE JOB TYPES AND SUBCATEGORIES ---\n${catalog.map(job => {
                const subs = Array.isArray(job.subcategories) ? job.subcategories : [];
                const subText = subs.length ? subs.map(s => `      - "${s}"`).join('\n') : '      - (none)';
                return `• Job Type: "${job.label}"\n  Subcategories:\n${subText}`;
            }).join('\n')}\n`
            : '';

        const scopeFormatted = formatScopeForAI(req.body);
        const systemPrompt = `You are a master construction estimator for Build With OSV.

Your ONLY job in this call is to classify the job type and subcategory from photos and notes.
Pick exactly one job_type from the provided AVAILABLE JOB TYPES list.
Pick the best matching subcategory from that chosen job type list, or null if unclear.

Return ONLY valid JSON in this exact shape, no markdown:
{
  "job_type": "Exact job type label from provided list",
  "subcategory": "Exact subcategory label from the chosen job type list, or null",
  "description": "Short improved scope description",
  "site_notes": "Short hazards/access/material notes"
}`;

        const content = [];
        photos.forEach((photo, idx) => {
            const parsed = parseBase64Image(photo.image);
            if (parsed) {
                content.push({
                    type: "image",
                    source: { type: "base64", media_type: parsed.media_type, data: parsed.data }
                });
                content.push({
                    type: "text",
                    text: `Photo ${idx + 1} — User notes: ${photo.description || 'No description provided'}`
                });
            }
        });

        content.push({
            type: "text",
            text: `\n--- Structured Scope ---\n${scopeFormatted}${catalogBlock}\nClassify the best job type and subcategory using the provided catalog only.`
        });

        const msg = await anthropic.messages.create({
            model: "openai/gpt-5.4",
            max_tokens: 1000,
            temperature: 0.05,
            system: systemPrompt,
            messages: [{ role: "user", content }]
        });

        let rawResponse = msg.content[0].text;
        rawResponse = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        let result;
        try {
            result = JSON.parse(rawResponse);
        } catch (e) {
            console.error("Classify-scope JSON parse error. Raw:", rawResponse);
            return res.status(500).json({ error: 'AI returned invalid JSON during scope classification.' });
        }

        res.json({ success: true, data: result });
    } catch (err) {
        console.error("Classify Scope Error:", err);
        res.status(500).json({ error: 'Failed to classify scope.' });
    }
});

router.post('/analyze-scope', async (req, res) => {
    try {
        const { photos, scope_field_schema, subcategory_options } = req.body;

        if (!photos || !Array.isArray(photos) || photos.length < 3) {
            return res.status(400).json({ error: 'A minimum of 3 site photos is required for scope analysis.' });
        }
        if (photos.length > 5) {
            return res.status(400).json({ error: 'A maximum of 5 photos is allowed.' });
        }

        if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'dummy_key_for_now') {
            return res.status(500).json({ error: 'Please update OPENROUTER_API_KEY in backend/.env to use OSV Vision AI.' });
        }

        const scopeFormatted = formatScopeForAI(req.body);

        let fieldSchemaBlock = '';
        if (scope_field_schema && Array.isArray(scope_field_schema)) {
            fieldSchemaBlock = '\n\n--- SCOPE FIELD SCHEMA (you MUST populate these) ---\n';
            scope_field_schema.forEach(f => {
                let line = `• ${f.key} (${f.type}): "${f.label}"`;
                if (f.required) line += ' [REQUIRED]';
                if (f.options && f.options.length) line += ` — valid values: ${JSON.stringify(f.options)}`;
                fieldSchemaBlock += line + '\n';
            });
        }

        let subcatBlock = '';
        if (subcategory_options && Array.isArray(subcategory_options) && subcategory_options.length) {
            subcatBlock = `\n\n--- AVAILABLE SUBCATEGORIES ---\n${subcategory_options.map(s => `• "${s}"`).join('\n')}\nChoose the single best match from the list above, or null if none fit.\n`;
        }

        const systemPrompt = `You are a master construction estimator for Build With OSV, a Melbourne-based trades business covering 14 trade categories including fencing, decking, pergolas, landscaping, excavation, cladding, carpentry, painting, structural work, renovations, commercial fit-outs, property maintenance, 3D rendering, and project management.

You are receiving 3-5 site photos with user-provided descriptions, plus structured scope details (job type, subcategory, and trade-specific fields). Your job:

1. ANALYZE every photo. For each one, determine whether it is a site photo, architectural blueprint, or hand-drawn sketch. Extract all relevant construction details — measurements, materials, conditions, access issues, hazards, soil type, existing structures, and anything that affects scope or pricing.

2. SYNTHESIZE all visual evidence with the user's structured scope fields to produce an enhanced, professional scope. You MUST auto-fill the trade-specific scope fields listed in the SCOPE FIELD SCHEMA section below. For "select" fields, you MUST choose from the valid values provided. For "multi-select" fields, return an array of valid values. For "boolean" fields, return true or false. For "number" fields, return a number or null if you cannot determine it. For "text"/"textarea" fields, return a string or null.

3. For any field you genuinely cannot determine from the photos or context, include its key in the "unfilled_fields" array so the user is prompted to fill it in manually.

4. IDENTIFY GAPS — if the photos are missing critical angles or details needed for accurate quoting, specify exactly what additional photos are needed (maximum 2). Only request additional photos when genuinely necessary; if the provided photos are comprehensive, return an empty array.

Return ONLY valid JSON in this exact format, with NO markdown formatting:
{
  "enhanced_scope": {
    "job_type": "The most accurate job type label",
    "subcategory": "Best matching subcategory from the available list, or null",
    "description": "Comprehensive professional scope description synthesised from all visual evidence, trade-specific fields, and user input",
    "site_notes": "All identified hazards, access constraints, soil conditions, structural observations",
    "scope_fields": {
      "field_key": "value for each scope field you can determine from photos and context"
    },
    "unfilled_fields": ["field_keys_you_cannot_determine"]
  },
  "photo_analysis": {
    "summary": "2-3 sentence overview of what you observed across all photos",
    "per_photo": [
      { "index": 0, "type": "site_photo|blueprint|sketch", "observations": "Key details extracted from this specific image" }
    ]
  },
  "additional_images_needed": [
    { "title": "Short title for the photo needed", "description": "What to photograph and from what angle", "reason": "Why this photo is critical for accurate quoting" }
  ]
}`;

        const content = [];

        photos.forEach((photo, idx) => {
            const parsed = parseBase64Image(photo.image);
            if (parsed) {
                content.push({
                    type: "image",
                    source: { type: "base64", media_type: parsed.media_type, data: parsed.data }
                });
                content.push({
                    type: "text",
                    text: `Photo ${idx + 1} — User notes: ${photo.description || 'No description provided'}`
                });
            }
        });

        content.push({ type: "text", text: `\n--- Structured Scope ---\n${scopeFormatted}${fieldSchemaBlock}${subcatBlock}\n\nAnalyze every photo above in conjunction with these scope fields and field schema. Auto-fill every scope field you can determine. Produce the enhanced scope JSON.` });

        const msg = await anthropic.messages.create({
            model: "openai/gpt-5.4",
            max_tokens: 3000,
            temperature: 0.15,
            system: systemPrompt,
            messages: [{ role: "user", content }]
        });

        let rawResponse = msg.content[0].text;
        rawResponse = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        let result;
        try {
            result = JSON.parse(rawResponse);
        } catch (e) {
            console.error("Analyze-scope JSON parse error. Raw:", rawResponse);
            return res.status(500).json({ error: 'AI returned invalid JSON during scope analysis.' });
        }

        res.json({ success: true, data: result });
    } catch (err) {
        console.error("Analyze Scope Error:", err);
        res.status(500).json({ error: 'Failed to analyze photos and scope.' });
    }
});

router.post('/analyze-blueprint', async (req, res) => {
    try {
        const { image } = req.body;
        
        if (!image) return res.status(400).json({ error: 'No blueprint or image payload provided.' });
        
        if (process.env.OPENROUTER_API_KEY === 'dummy_key_for_now' || !process.env.OPENROUTER_API_KEY) {
            return res.status(500).json({ error: 'Please update OPENROUTER_API_KEY in backend/.env to use OSV Vision AI.' });
        }

        const parsed = parseBase64Image(image);
        if (!parsed) return res.status(400).json({ error: 'Invalid base64 encoding format from UI component.' });

        const systemPrompt = `You are a master architectural construction estimator for Build With OSV. Analyze the provided architectural blueprint, rough sketch, or site photo. Extract the core foundational scope of work and return ONLY valid JSON in this exact format, with NO markdown formatting:
{
  "job_type": "Fencing|Decking|Retaining Wall|Pergola|Landscaping|General Construction",
  "dimensions": "Extract measurements accurately (e.g. '20m long, 1.8m high')",
  "description": "Write a highly professional, accurate scope description based purely on the visual evidence provided",
  "site_notes": "Extract any visible hazards, structural access issues, or specific materials mentioned"
}`;

        const msg = await anthropic.messages.create({
            model: "openai/gpt-5.4",
            max_tokens: 1500,
            temperature: 0.1,
            system: systemPrompt,
            messages: [{
                role: "user",
                content: [
                    {
                        type: "image",
                        source: {
                            type: "base64",
                            media_type: parsed.media_type,
                            data: parsed.data
                        }
                    },
                    {
                        type: "text",
                        text: "Formulate the extraction JSON natively off this visual document."
                    }
                ]
            }]
        });
        
        let rawResponse = msg.content[0].text;
        rawResponse = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const result = JSON.parse(rawResponse);
        res.json({ success: true, data: result });
    } catch (err) {
        console.error("OSV Blueprint Analysis Error:", err);
        res.status(500).json({ error: 'Failed to visually analyze architectural blueprint.' });
    }
});

router.post('/score-lead', async (req, res) => {
    res.json({ success: true, scores: { profitScore: 8, riskScore: 2, complexity: 'Low' } });
});

export default router;
