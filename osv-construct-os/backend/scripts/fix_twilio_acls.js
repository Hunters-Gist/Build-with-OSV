import 'dotenv/config';
import twilio from 'twilio';
import dns from 'dns/promises';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Trunks identified earlier
const inboundTrunkSid = 'TK11e6be58c0cb914ac6688324bc782f42';
const outboundTrunkSid = 'TKc3dc8b4f5b229658cf76722eb74e0c81';

async function updateAcls() {
  try {
    console.log('Resolving sip.retellai.com...');
    const retellIps = await dns.resolve4('sip.retellai.com');
    // Also include historically known Retell IPs just in case:
    const knownIps = new Set([...retellIps, '18.98.16.120', '18.98.66.49', '18.98.66.242']);
    console.log('Total Retell IPs target:', Array.from(knownIps));

    console.log('Retrieving Twilio IP Access Control Lists...');
    const acls = await client.sip.ipAccessControlLists.list({ limit: 50 });
    let retellAcl = acls.find(a => a.friendlyName === 'Retell IPs');
    if (!retellAcl) {
      console.log('Creating new Retell IPs ACL...');
      retellAcl = await client.sip.ipAccessControlLists.create({ friendlyName: 'Retell IPs' });
    }

    console.log('Checking existing IP addresses in the ACL...');
    const existingIps = await client.sip.ipAccessControlLists(retellAcl.sid).ipAddresses.list();
    const existingIpStrings = existingIps.map(ip => ip.ipAddress);

    for (const ip of knownIps) {
      if (!existingIpStrings.includes(ip)) {
        console.log(`Adding missing IP: ${ip} to ACL...`);
        await client.sip.ipAccessControlLists(retellAcl.sid).ipAddresses.create({
          friendlyName: `Retell IP ${ip}`,
          ipAddress: ip,
          cidrPrefixLength: 32
        });
      } else {
        console.log(`IP ${ip} already exists in ACL.`);
      }
    }

    // Apply ACL to both Trunks
    const trunks = [inboundTrunkSid, outboundTrunkSid];
    for (const tsid of trunks) {
      console.log(`Checking mapping on Trunk ${tsid}...`);
      const mapped = await client.trunking.v1.trunks(tsid).ipAccessControlLists.list();
      if (!mapped.find(m => m.ipAccessControlListSid === retellAcl.sid)) {
        await client.trunking.v1.trunks(tsid).ipAccessControlLists.create({
          ipAccessControlListSid: retellAcl.sid
        });
        console.log(`Bound Retell ACL to Trunk ${tsid}`);
      } else {
        console.log(`Trunk ${tsid} is already bound to Retell ACL.`);
      }
    }

    console.log('Twilio IP ACL Configuration complete.');
  } catch (err) {
    console.error('Error updating Twilio ACLs:', err);
  }
}
updateAcls();
