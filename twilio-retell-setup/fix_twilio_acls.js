import 'dotenv/config';
import twilio from 'twilio';

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function wildcardAcl() {
  console.log('Fetching Trunks...');
  const trunks = await twilioClient.trunking.v1.trunks.list();
  
  for (const trunk of trunks) {
    if (trunk.friendlyName.toLowerCase().includes('retell')) {
      console.log(`Processing Trunk: ${trunk.friendlyName} (${trunk.sid})`);
      
      const acls = await twilioClient.trunking.v1.trunks(trunk.sid).ipAccessControlLists.list();
      let targetAclSid = null;
      
      if (acls.length === 0) {
        console.log(`  No ACL attached! Creating and attaching a global one...`);
        const newAcl = await twilioClient.sip.ipAccessControlLists.create({ friendlyName: `Global ACL for ${trunk.friendlyName}` });
        targetAclSid = newAcl.sid;
        await twilioClient.trunking.v1.trunks(trunk.sid).ipAccessControlLists.create({ ipAccessControlListSid: targetAclSid });
      } else {
        targetAclSid = acls[0].sid; // Or specifically looking for the Retell IPs one
        const parentAcl = await twilioClient.sip.ipAccessControlLists(targetAclSid).fetch();
        console.log(`  Using existing attached ACL: ${parentAcl.friendlyName} (${targetAclSid})`);
      }
      
      console.log(`  Adding 0.0.0.0/1 and 128.0.0.0/1 to ACL ${targetAclSid}...`);
      try {
        await twilioClient.sip.ipAccessControlLists(targetAclSid).ipAddresses.create({
          friendlyName: 'Any IPv4 Part 1',
          ipAddress: '0.0.0.0',
          cidrPrefixLength: 1
        });
        console.log('  -> Added 0.0.0.0/1 successfully.');
      } catch (e) {
        if (e.code === 21200 || e.message.includes("already exists")) console.log('  -> Any IPv4 Part 1 already exists or IP is invalid? Error:', e.message);
        else console.log(`  -> Failed Part 1: ${e.message}`);
      }
      
      try {
        await twilioClient.sip.ipAccessControlLists(targetAclSid).ipAddresses.create({
          friendlyName: 'Any IPv4 Part 2',
          ipAddress: '128.0.0.0',
          cidrPrefixLength: 1
        });
        console.log('  -> Added 128.0.0.0/1 successfully.');
      } catch (e) {
        if (e.code === 21200 || e.message.includes("already exists")) console.log('  -> Any IPv4 Part 2 already exists or IP is invalid? Error:', e.message);
        else console.log(`  -> Failed Part 2: ${e.message}`);
      }
      console.log(`  Done with Trunk: ${trunk.friendlyName}\n`);
    }
  }
}

wildcardAcl().catch(console.error);
