import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function checkDomains() {
  try {
    const trunks = await client.trunking.v1.trunks.list({ limit: 20 });
    for (const trunk of trunks) {
      console.log(`Trunk SID: ${trunk.sid}, FriendlyName: ${trunk.friendlyName}, DomainName: ${trunk.domainName}`);
    }
  } catch (error) {
    console.error('Error fetching trunks:', error.message);
  }
}

checkDomains();
