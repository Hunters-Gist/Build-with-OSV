import 'dotenv/config';
import twilio from 'twilio';
import { Retell } from 'retell-sdk';

const retell = new Retell({ apiKey: process.env.RETELL_API_KEY });
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function diagnose() {
  // 1. Get latest Retell call
  console.log('=== RETELL CALL LOG ===');
  const calls = await retell.call.list({ limit: 1 });
  if (calls && calls.length > 0) {
    const c = calls[0];
    console.log(`Call ID: ${c.call_id}`);
    console.log(`Duration: ${c.duration_ms}ms`);
    console.log(`Disconnect Reason: ${c.disconnection_reason}`);
    console.log(`Call Status: ${c.call_status}`);
    if (c.call_analysis) {
      console.log(`Call Summary: ${c.call_analysis.call_summary}`);
      console.log(`Successful: ${c.call_analysis.call_successful}`);
    }
    // Check for tool calls in the transcript
    if (c.transcript_with_tool_calls) {
      console.log('\n--- Tool Calls in Transcript ---');
      for (const entry of c.transcript_with_tool_calls) {
        if (entry.role === 'tool_call_invocation' || entry.tool_call_id || entry.name) {
          console.log(JSON.stringify(entry, null, 2));
        }
      }
    }
    // Print full transcript_with_tool_calls for visibility
    console.log('\n--- Full Transcript with Tool Calls ---');
    console.log(JSON.stringify(c.transcript_with_tool_calls, null, 2));
  }

  // 2. Check Twilio alerts
  console.log('\n=== TWILIO ALERTS (last 10) ===');
  const alerts = await twilioClient.monitor.v1.alerts.list({ limit: 10 });
  if (alerts.length === 0) {
    console.log('No alerts.');
  }
  alerts.forEach(a => {
    console.log(`[${a.dateGenerated}] Error ${a.errorCode}: ${a.alertText}`);
  });

  // 3. Check SIP Trunk config
  console.log('\n=== TWILIO SIP TRUNKS ===');
  const trunks = await twilioClient.trunking.v1.trunks.list();
  for (const trunk of trunks) {
    console.log(`Trunk: ${trunk.friendlyName} (${trunk.sid})`);
    console.log(`  Transfer Mode: ${trunk.transferMode}`);
    console.log(`  Transfer Caller ID: ${trunk.transferCallerId}`);
    
    // Check origination URIs
    const origins = await twilioClient.trunking.v1.trunks(trunk.sid).originationUrls.list();
    console.log(`  Origination URLs:`);
    origins.forEach(o => console.log(`    - ${o.sipUrl} (enabled: ${o.enabled}, priority: ${o.priority})`));
    
    // Check phone numbers
    const phones = await twilioClient.trunking.v1.trunks(trunk.sid).phoneNumbers.list();
    console.log(`  Phone Numbers:`);
    phones.forEach(p => console.log(`    - ${p.phoneNumber}`));
    
    // Check IP ACLs
    const acls = await twilioClient.trunking.v1.trunks(trunk.sid).ipAccessControlLists.list();
    console.log(`  IP ACLs:`);
    acls.forEach(a => console.log(`    - ${a.friendlyName} (${a.sid})`));
    
    // Check Termination
    console.log(`  Termination URI: ${trunk.terminationUriFetched || 'N/A'}`);
  }
}

diagnose().catch(console.error);
