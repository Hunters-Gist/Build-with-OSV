import 'dotenv/config';
import twilio from 'twilio';

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function checkAndFixTrunks() {
  console.log('=== TWILIO SIP TRUNKS ===');
  const trunks = await twilioClient.trunking.v1.trunks.list();
  
  if (trunks.length === 0) {
    console.log("No trunks found!");
    return;
  }
  
  for (const trunk of trunks) {
    console.log(`\nTrunk: ${trunk.friendlyName} (${trunk.sid})`);
    console.log(`  Current Transfer Mode: ${trunk.transferMode}`);
    console.log(`  Current Transfer Caller ID: ${trunk.transferCallerId}`);
    
    let needsUpdate = false;
    let updateParams = {};
    
    if (trunk.transferMode !== 'enable-all') {
      console.log('  -> Needs transferMode update');
      updateParams.transferMode = 'enable-all';
      needsUpdate = true;
    }
    
    if (trunk.transferCallerId !== 'from-transferor') {
      console.log('  -> Needs transferCallerId update to from-transferor (to prevent spoofing blocks)');
      updateParams.transferCallerId = 'from-transferor';
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      console.log('  -> Updating trunk...');
      const updatedTrunk = await twilioClient.trunking.v1.trunks(trunk.sid).update(updateParams);
      console.log(`  -> Updated Transfer Mode: ${updatedTrunk.transferMode}`);
      console.log(`  -> Updated Transfer Caller ID: ${updatedTrunk.transferCallerId}`);
    } else {
      console.log('  -> Trunk is configured perfectly for SIP REFER.');
    }
    
    // Check Origination URLs
    const origins = await twilioClient.trunking.v1.trunks(trunk.sid).originationUrls.list();
    if (origins.length === 0) {
        console.log('  -> WARNING: No Origination URLs found on this trunk!');
    } else {
        origins.forEach(o => console.log(`  -> Origination URL: ${o.sipUrl} (enabled: ${o.enabled})`));
    }
  }
}

checkAndFixTrunks().catch(console.error);
