import 'dotenv/config';
import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function setupTwilio() {
  const numberSid = 'PN31fafff26833b37ba91dffcb68ac519a';
  const trunkSid = 'TK11e6be58c0cb914ac6688324bc782f42';

  try {
    console.log('Testing Twilio authentication...');
    const account = await client.api.v2010.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    console.log(`Successfully authenticated as ${account.friendlyName}. Status: ${account.status}`);

    // Update Trunk Settings
    console.log('Updating SIP Trunk configuration...');
    await client.trunking.v1.trunks(trunkSid).update({
      secure: true,
      transferMode: 'enable-all'
    });
    console.log('Enabled Secure Trunking & Call Transfer on Trunk.');
    
    // There is no explicit API property simply called "symmetricRtp" on the Trunk update object in Twilio's standard Node library, 
    // it's usually handled per origination URL or via the console UI. 

    // Create / Update Origination URI
    console.log('Configuring Origination URI...');
    const existingUris = await client.trunking.v1.trunks(trunkSid).originationUrls.list();
    if (existingUris.length === 0) {
      await client.trunking.v1.trunks(trunkSid).originationUrls.create({
        weight: 1,
        priority: 1,
        enabled: true,
        friendlyName: 'Retell Inbound',
        sipUrl: 'sip:sip.retellai.com'
      });
      console.log('Added Origination URI: sip:retell-osv-aus.pstn.twilio.com');
    }

    // Connect Phone Number to Trunk
    console.log('Mapping Phone Number to SIP Trunk...');
    await client.incomingPhoneNumbers(numberSid).update({
      trunkSid: trunkSid,
      voiceUrl: '', // Clear any existing webhook logic
      voiceMethod: 'POST'
    });
    console.log('Successfully mapped +61 485 020 333 to Retell OSV Trunk.');

    // Configure IP ACL for Outbound transfers from Retell 
    console.log('Setting up IP ACL for Retell Outbound bridge_transfer...');
    const acls = await client.sip.ipAccessControlLists.list({ limit: 50 });
    let retellAcl = acls.find(a => a.friendlyName === 'Retell IPs');
    if (!retellAcl) {
      retellAcl = await client.sip.ipAccessControlLists.create({ friendlyName: 'Retell IPs' });
      await client.sip.ipAccessControlLists(retellAcl.sid).ipAddresses.create({
        friendlyName: 'Retell 1',
        ipAddress: '18.98.16.120',
        cidrPrefixLength: 30
      });
      console.log('Created IP Access Control List for Retell.');
    }

    const mappedAcls = await client.trunking.v1.trunks(trunkSid).ipAccessControlLists.list();
    if (!mappedAcls.find(a => a.ipAccessControlListSid === retellAcl.sid)) {
      await client.trunking.v1.trunks(trunkSid).ipAccessControlLists.create({
        ipAccessControlListSid: retellAcl.sid
      });
      console.log('Bound Retell IP ACL to Trunk.');
    }

    console.log("\\n>>> COMPLETE! Everything is fully connected. Call +61485020333 to speak to Jaque's assistant! <<<");

  } catch (error) {
    console.error('Twilio Setup Error:', error.message);
  }
}

setupTwilio();
