import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function checkRecording() {
  const trunkSid = 'TKc3dc8b4f5b229658cf76722eb74e0c81';
  try {
    const trunk = await client.trunking.v1.trunks(trunkSid).recording.fetch();
    console.log('Trunk Recording Settings:', trunk.mode, trunk.trim);
  } catch (err) {
    if (err.status === 404) {
      console.log('No specific recording settings found (usually defaults to disabled or not configured in this API endpoint)');
    } else {
      console.error(err);
    }
  }
}

checkRecording();
