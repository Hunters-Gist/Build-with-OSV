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
            model: "anthropic/claude-sonnet-4.6",
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
        const { job_type, description, dimensions, site_notes, images } = req.body;
        
        if (process.env.OPENROUTER_API_KEY === 'dummy_key_for_now' || !process.env.OPENROUTER_API_KEY) {
            return res.status(500).json({ error: 'Please update OPENROUTER_API_KEY in backend/.env with your valid key to use the live AI engine.' });
        }

        const systemPrompt = `You are a master construction estimator. Review the job details and the provided site photos. Formulate 3 to 5 qualifying questions you still need answered by the client to provide a highly accurate and reliable quote. Ask about specific things you noticed in the photos or crucial details missing from the description.
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
            text: `Job Type: ${job_type}\nDimensions: ${dimensions}\nDescription: ${description}\nSite Notes: ${site_notes}\nGenerate the qualifying questions JSON.`
        });

        const msg = await anthropic.messages.create({
            model: "anthropic/claude-sonnet-4.6",
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
        const { job_type, description, dimensions, site_notes, force_manual_pricing, images, qa_responses } = req.body;
        
        if (process.env.OPENROUTER_API_KEY === 'dummy_key_for_now' || !process.env.OPENROUTER_API_KEY) {
            return res.status(500).json({ error: 'Please update OPENROUTER_API_KEY in backend/.env with your valid key to use the live AI engine.' });
        }

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
        
        let userPromptText = `Job Type: ${job_type}\nDimensions: ${dimensions}\nDescription: ${description}\nSite Notes: ${site_notes}\n`;
        if (qa_responses && qa_responses.length > 0) {
            userPromptText += "\nQualifying Questions & Answers:\n";
            qa_responses.forEach(qa => {
                userPromptText += `Q: ${qa.question}\nA: ${qa.answer}\n`;
            });
        }
        userPromptText += "\nGenerate the highly accurate final quote JSON incorporating the visual evidence and client answers provided.";
        
        content.push({ type: "text", text: userPromptText });
        
        let anthropicParams = {
            model: "anthropic/claude-sonnet-4.6",
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
            model: "anthropic/claude-sonnet-4.6",
            max_tokens: 1500,
            temperature: 0.1, // Strict determinism for scope extraction
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
