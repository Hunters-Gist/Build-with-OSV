function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9.\sx/-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

const MATERIAL_HINTS = [
    'merbau',
    'spotted gum',
    'blackbutt',
    'h4 treated pine',
    'treated pine',
    'ekodeck',
    'modwood',
    'trex',
    'millboard',
    'road base',
    'crusher dust',
    'topsoil',
    'turf',
    'sir walter',
    'kikuyu',
    'tiftuf',
    'concrete',
    'aggregate',
    'scoria',
    'paving',
    'fence',
    'colorbond',
    'james hardie',
    'scyon',
    'easycraft',
    'laminex',
    'paint',
    'dulux',
    'haymes',
    'wattyl'
];

export function normalizeMaterialSpec(lineItem, tradeLabel = '') {
    const text = normalizeText(`${lineItem?.name || ''} ${lineItem?.description || ''}`);
    const trade = normalizeText(tradeLabel);

    const unit = normalizeText(lineItem?.unit || '');
    const qty = Number(lineItem?.qty || 0);

    const hints = [];
    for (const hint of MATERIAL_HINTS) {
        if (text.includes(hint)) hints.push(hint);
    }

    const dimensionMatch = text.match(/(\d{2,4}\s*x\s*\d{1,3}(?:\s*x\s*\d{1,3})?)/);
    const thicknessMatch = text.match(/(\d+(?:\.\d+)?)\s*mm/);
    const isMaterials = String(lineItem?.category || '').toLowerCase() === 'materials';

    const normalizedKeyParts = [
        hints.join('_') || text.split(' ').slice(0, 4).join('_'),
        dimensionMatch ? dimensionMatch[1].replace(/\s+/g, '') : null,
        thicknessMatch ? `${thicknessMatch[1]}mm` : null,
        unit || null,
        trade || null
    ].filter(Boolean);

    const confidenceBase = hints.length > 0 ? 0.7 : 0.45;
    const confidence = Math.min(0.95, confidenceBase + (dimensionMatch ? 0.15 : 0) + (thicknessMatch ? 0.1 : 0));

    return {
        isMaterials,
        normalizedKey: normalizedKeyParts.join('|'),
        searchText: text,
        inferredMaterial: hints[0] || text,
        dimensions: dimensionMatch ? dimensionMatch[1] : null,
        unit,
        qty,
        confidence
    };
}

