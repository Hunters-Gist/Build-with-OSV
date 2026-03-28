import 'dotenv/config';
import { Retell } from 'retell-sdk';

const retell = new Retell({ apiKey: process.env.RETELL_API_KEY });

async function getLatestCall() {
  const calls = await retell.call.list({ limit: 1 });
  if (calls && calls.length > 0) {
    const latest = calls[0];
    console.log(`Latest Call ID: ${latest.call_id}`);
    console.log(`Duration: ${latest.duration_ms} ms`);
    console.log(`Disconnect Reason: ${latest.disconnection_reason}`);
    if (latest.call_analysis) {
        console.log(`Transcripts: `, JSON.stringify(latest.call_analysis.transcript, null, 2));
    }
  } else {
    console.log('No calls found.');
  }
}
getLatestCall().catch(console.error);
