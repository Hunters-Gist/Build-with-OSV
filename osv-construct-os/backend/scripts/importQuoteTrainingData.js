import db from '../src/db/index.js';
import { runTrainingImport } from '../src/services/quotes/quoteTrainingImportService.js';

function run() {
    const report = runTrainingImport(db);
    if (report.summary.scannedFiles === 0) {
        const inboxPath = report.status?.paths?.inboxDir || 'training-data/inbox';
        console.log(`No training files found in: ${inboxPath}`);
        return;
    }
    for (const row of report.results) {
        if (row.success) {
            console.log(`Imported ${row.fileName}: datasets=${row.importedDatasets}, metrics=${row.importedMetrics}, bundles=${row.importedBundles}`);
        } else {
            console.error(`Failed to import ${row.fileName}: ${row.error}`);
        }
    }
    console.log(`Import complete. Success=${report.summary.successCount}, Failed=${report.summary.failedCount}`);
}

run();
