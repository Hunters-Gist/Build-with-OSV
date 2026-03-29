import 'dotenv/config';
import { randomUUID } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import db from '../src/db/index.js';

const anthropic = new Anthropic({
    apiKey: process.env.OPENROUTER_API_KEY || 'missing_key',
    baseURL: 'https://openrouter.ai/api',
    defaultHeaders: {
        "HTTP-Referer": "https://osv-saa-s.vercel.app",
        "X-Title": "Build With OSV"
    }
});

function parseArgs(argv) {
    const args = new Set(argv.slice(2));
    const rollbackArg = argv.find((arg) => arg.startsWith('--rollback='));
    return {
        activate: args.has('--activate'),
        dryRun: args.has('--dry-run'),
        rollbackVersion: rollbackArg ? Number(rollbackArg.split('=')[1]) : null
    };
}

function getNextVersion() {
    const row = db.prepare('SELECT MAX(version) AS max_version FROM quote_prompt_profiles').get();
    return Number(row?.max_version || 0) + 1;
}

function buildOptimizationInput() {
    const rows = db.prepare(`
        SELECT trade, category, item_signature, item_name,
               COUNT(*) AS sample_count,
               AVG(COALESCE(unit_price_delta_pct, 0)) AS avg_unit_price_delta_pct,
               AVG(COALESCE(total_delta_pct, 0)) AS avg_total_delta_pct
        FROM quote_adjustment_deltas
        WHERE created_at >= ?
          AND ABS(COALESCE(total_delta_pct, 0)) >= 0.03
          AND change_type = 'updated'
        GROUP BY trade, category, item_signature, item_name
        HAVING COUNT(*) >= 3
        ORDER BY sample_count DESC, ABS(AVG(COALESCE(total_delta_pct, 0))) DESC
        LIMIT 80
    `).all(Date.now() - (90 * 24 * 60 * 60 * 1000));

    return rows;
}

async function generateProfile(rows) {
    const system = `You are a pricing systems optimizer for a construction quote engine.
Return only valid JSON with this exact schema:
{
  "summary": "short explanation",
  "system_append": "short instruction patch to append to system prompt",
  "trade_biases": [
    { "trade": "...", "category": "...", "bias_pct": 0.0, "note": "..." }
  ],
  "safety_limits": {
    "max_bias_abs_pct": 0.12,
    "min_samples": 3
  }
}
Do not exceed absolute 0.12 bias in any recommendation.
Focus only on persistent trends with strong sample counts.`;

    const user = `Recent manual quote adjustment aggregates:\n${JSON.stringify(rows, null, 2)}\n\nGenerate optimization profile JSON now.`;

    const msg = await anthropic.messages.create({
        model: "openai/gpt-5.4",
        max_tokens: 1800,
        temperature: 0.1,
        system,
        messages: [{ role: 'user', content: user }]
    });

    let raw = msg.content?.[0]?.text || '{}';
    raw = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(raw);
}

function setActiveProfile(version) {
    const tx = db.transaction(() => {
        db.prepare('UPDATE quote_prompt_profiles SET is_active = 0').run();
        db.prepare('UPDATE quote_prompt_profiles SET is_active = 1, approved_at = ? WHERE version = ?').run(Date.now(), version);
    });
    tx();
}

async function main() {
    const args = parseArgs(process.argv);

    if (Number.isFinite(args.rollbackVersion) && args.rollbackVersion > 0) {
        setActiveProfile(args.rollbackVersion);
        console.log(`Rolled back active prompt profile to version ${args.rollbackVersion}.`);
        return;
    }

    const rows = buildOptimizationInput();
    if (rows.length < 10) {
        console.log('Not enough high-confidence deltas to generate a prompt profile (need at least 10 grouped records).');
        return;
    }

    const generated = await generateProfile(rows);
    const version = getNextVersion();

    if (args.dryRun) {
        console.log(JSON.stringify({ version, generated }, null, 2));
        return;
    }

    db.prepare(`
        INSERT INTO quote_prompt_profiles (
            id, version, trade, summary, profile_json, generated_from_json, is_active, created_by, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        randomUUID(),
        version,
        null,
        generated.summary || 'Automated optimization profile',
        JSON.stringify(generated),
        JSON.stringify({ source_rows: rows.length }),
        args.activate ? 1 : 0,
        'optimizer_script',
        Date.now()
    );

    if (args.activate) {
        setActiveProfile(version);
    }

    console.log(`Stored quote prompt profile v${version}. Active=${args.activate ? 'yes' : 'no'}.`);
}

main().catch((error) => {
    console.error('Quote optimizer failed:', error?.message || error);
    process.exitCode = 1;
});
