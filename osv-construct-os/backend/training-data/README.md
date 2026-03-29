# Quote Training Data Inbox

Drop pricing datasets in `training-data/inbox/` and run:

```bash
npm run import:quote-training
```

Supported file types:

- `.json`
- `.xlsx`

What happens on import:

1. Files in `inbox/` are parsed into external pricing metrics.
2. Metrics are stored in the quote-learning database tables.
3. Imported data is used as pricing anchors in `POST /api/ai/generate-quote`.
4. Processed files are moved to `training-data/processed/`.
5. Failed files are moved to `training-data/failed/`.

Recommended JSON shape:

```json
{
  "deck_restoration_pricing": [
    {
      "category": "prep",
      "description": "Pressure wash / deck clean",
      "unit": "$/m2",
      "base_rate_ex_gst": 10,
      "sell_rate_ex_gst": 12,
      "notes": "Light clean prior to sanding and coating"
    }
  ],
  "bundles": [
    {
      "name": "Standard Restoration",
      "formula": "(prep + fixings + sanding_light + coat_2) * area + consumables",
      "typical_rate_per_m2_ex_gst": 76
    }
  ]
}
```

For Excel, include headers that map to:

- `category`
- `description` or `item_name`
- `unit`
- `base_rate_ex_gst`
- `sell_rate_ex_gst`
- `notes`
