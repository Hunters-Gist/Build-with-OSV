import 'dotenv/config';
import { Retell } from 'retell-sdk';

const retell = new Retell({ apiKey: process.env.RETELL_API_KEY });

async function diagnoseRetell() {
  const calls = await retell.call.list({ limit: 1 });
  if (calls && calls.length > 0) {
    const c = calls[0];
    console.log(`Call ID: ${c.call_id}`);
    console.log(`Duration: ${c.duration_ms}ms`);
    console.log(`Disconnect Reason: ${c.disconnection_reason}`);
    console.log(`Call Status: ${c.call_status}`);
    console.log(`From: ${c.from_number} -> To: ${c.to_number}`);
    if (c.call_analysis) {
      console.log(`Summary: ${c.call_analysis.call_summary}`);
      console.log(`Successful: ${c.call_analysis.call_successful}`);
    }
    if (c.tool_calls && c.tool_calls.length > 0) {
      console.log('\n--- Tool Calls ---');
      console.log(JSON.stringify(c.tool_calls, null, 2));
    } else {
      console.log('\nNo tool_calls array found on response.');
    }
    // Print transcript_with_tool_calls
    if (c.transcript_with_tool_calls) {
      console.log('\n--- Transcript with Tool Calls ---');
      for (const entry of c.transcript_with_tool_calls) {
        if (entry.role === 'agent') {
          console.log(`AGENT: ${entry.content}`);
        } else if (entry.role === 'user') {
          console.log(`USER: ${entry.content}`);
        } else {
          console.log(`[${entry.role || 'unknown'}]: ${JSON.stringify(entry)}`);
        }
      }
    }
    // Print raw transfer-relevant fields
    console.log(`\nTransfer destination: ${c.transfer_destination || 'none'}`);
  }
}
diagnoseRetell().catch(console.error);
