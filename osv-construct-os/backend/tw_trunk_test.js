import 'dotenv/config';
import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const trunkSid = 'TK11e6be58c0cb914ac6688324bc782f42';

async function checkAll() {
  try {
    const trunks = await client.trunking.v1.trunks.list();
    for (const t of trunks) {
      console.log(`Trunk: ${t.friendlyName} (${t.sid}) - Domain: ${t.domainName}`);
      let acls = await client.trunking.v1.trunks(t.sid).ipAccessControlLists.list();
      console.log(' - ACLs:', acls.length);
    }
    
    console.log('--- SIP Domains ---');
    const domains = await client.sip.domains.list();
    for (const d of domains) {
      console.log(`Domain: ${d.domainName} (${d.sid}) VoiceURL: ${d.voiceUrl}`);
    }

  } catch (e) {
    console.error(e);
  }
}
checkAll();
