export function incrementLearningMetric(db, metricKey, delta = 1) {
    const now = Date.now();
    db.prepare(`
        INSERT INTO quote_learning_metrics (metric_key, metric_value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(metric_key)
        DO UPDATE SET
            metric_value = metric_value + excluded.metric_value,
            updated_at = excluded.updated_at
    `).run(metricKey, delta, now);
}
