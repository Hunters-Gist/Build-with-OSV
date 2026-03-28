import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function checkTermination() {
  const trunkSid = 'TKc3dc8b4f5b229658cf76722eb74e0c81'; // The Retell AI Trunk
  try {
    const origUrls = await client.trunking.v1.trunks(trunkSid).originationUrls.list();
    console.log('Origination URLs:', origUrls.map(u => u.sipUrl));
    
    // Twilio SDK `client.trunking.v1.trunks(trunkSid).fetch()`
    const trunk = await client.trunking.v1.trunks(trunkSid).fetch();
    console.log('Trunk Details:', trunk.domainName, trunk.transferMode, trunk.transferCallerId);
  } catch (err) {
    console.error(err);
  }
}

checkTermination();
