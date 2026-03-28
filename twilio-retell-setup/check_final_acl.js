import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function checkFinalAcl() {
  const trunkSid = 'TKc3dc8b4f5b229658cf76722eb74e0c81';
  try {
    const acls = await client.trunking.v1.trunks(trunkSid).ipAccessControlLists.list();
    console.log(`\n--- ACLs attached to ${trunkSid} (${acls.length}) ---`);
    for (const aclLink of acls) {
      console.log('ACL Link SID is:', aclLink.sid);
      // Twilio API for trunk ACL link has .sid as the actual ACL sid
      const ips = await client.sip.ipAccessControlLists(aclLink.sid).ipAddresses.list();
      console.log(`\nACL (${aclLink.sid}):`);
      ips.forEach(ip => console.log(`  IP: ${ip.ipAddress}/${ip.cidrPrefixLength} - ${ip.friendlyName}`));
    }
  } catch (err) {
    console.error(err);
  }
}

checkFinalAcl();
