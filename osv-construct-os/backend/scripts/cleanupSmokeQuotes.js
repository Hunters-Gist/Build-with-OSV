import db from '../src/db/index.js';

function parseArgs(argv) {
    const args = {
        email: 'smoke@example.com',
        name: '',
        summaryContains: '',
        yes: false
    };

    for (const raw of argv) {
        if (raw === '--yes') args.yes = true;
        else if (raw.startsWith('--email=')) args.email = raw.slice('--email='.length).trim();
        else if (raw.startsWith('--name=')) args.name = raw.slice('--name='.length).trim();
        else if (raw.startsWith('--summary-contains=')) args.summaryContains = raw.slice('--summary-contains='.length).trim();
    }

    return args;
}

function buildTargetQuotesQuery({ email, name, summaryContains }) {
    const clauses = [];
    const params = [];

    if (email) {
        clauses.push("LOWER(COALESCE(client_email, '')) = LOWER(?)");
        params.push(email);
    }
    if (name) {
        clauses.push("LOWER(COALESCE(client_name, '')) = LOWER(?)");
        params.push(name);
    }
    if (summaryContains) {
        clauses.push("LOWER(COALESCE(summary, '')) LIKE LOWER(?)");
        params.push(`%${summaryContains}%`);
    }

    if (clauses.length === 0) {
        throw new Error('Refusing to run with no selection criteria. Provide at least one of --email, --name, --summary-contains.');
    }

    const sql = `
        SELECT id, quote_num, client_name, client_email, status, created_at
        FROM quotes
        WHERE ${clauses.join(' AND ')}
        ORDER BY created_at DESC
    `;
    return { sql, params };
}

function formatTs(ts) {
    if (!ts) return 'n/a';
    try {
        return new Date(Number(ts)).toISOString();
    } catch (_) {
        return String(ts);
    }
}

function main() {
    const opts = parseArgs(process.argv.slice(2));
    const { sql, params } = buildTargetQuotesQuery(opts);
    const targetQuotes = db.prepare(sql).all(...params);

    console.log('--- Smoke Quote Cleanup ---');
    console.log(`Filters: email=${opts.email || '(none)'} | name=${opts.name || '(none)'} | summary-contains=${opts.summaryContains || '(none)'}`);
    console.log(`Matches: ${targetQuotes.length}`);

    if (targetQuotes.length > 0) {
        console.log('\nMatched quotes:');
        for (const q of targetQuotes) {
            console.log(`- ${q.quote_num || q.id} | ${q.client_name || 'n/a'} | ${q.client_email || 'n/a'} | ${q.status || 'n/a'} | ${formatTs(q.created_at)}`);
        }
    }

    if (!opts.yes) {
        console.log('\nDry-run only. No rows deleted.');
        console.log('Run again with --yes to execute deletion.');
        process.exit(0);
    }

    if (targetQuotes.length === 0) {
        console.log('\nNo matching rows. Nothing to delete.');
        process.exit(0);
    }

    const quoteIds = targetQuotes.map((q) => q.id);
    const placeholders = quoteIds.map(() => '?').join(',');

    const deleteTx = db.transaction(() => {
        const delDeltas = db.prepare(`DELETE FROM quote_adjustment_deltas WHERE quote_id IN (${placeholders})`).run(...quoteIds).changes;
        const delRevisions = db.prepare(`DELETE FROM quote_revisions WHERE quote_id IN (${placeholders})`).run(...quoteIds).changes;
        const delPortalAudit = db.prepare(`DELETE FROM quote_portal_audit WHERE quote_id IN (${placeholders})`).run(...quoteIds).changes;
        const delPortalNonces = db.prepare(`DELETE FROM quote_portal_nonces WHERE quote_id IN (${placeholders})`).run(...quoteIds).changes;
        const delQuotes = db.prepare(`DELETE FROM quotes WHERE id IN (${placeholders})`).run(...quoteIds).changes;
        return {
            delDeltas,
            delRevisions,
            delPortalAudit,
            delPortalNonces,
            delQuotes
        };
    });

    const result = deleteTx();
    console.log('\nDeleted rows:');
    console.log(`- quote_adjustment_deltas: ${result.delDeltas}`);
    console.log(`- quote_revisions: ${result.delRevisions}`);
    console.log(`- quote_portal_audit: ${result.delPortalAudit}`);
    console.log(`- quote_portal_nonces: ${result.delPortalNonces}`);
    console.log(`- quotes: ${result.delQuotes}`);
}

try {
    main();
} catch (error) {
    console.error('Cleanup failed:', error.message);
    process.exit(1);
}
