import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function checkOptions() {
  const trunkSid = 'TKc3dc8b4f5b229658cf76722eb74e0c81';
  try {
    const recording = await client.trunking.v1.trunks(trunkSid).recording().fetch();
    console.log(recording);
  } catch (err) {
    console.error(err.message);
  }
}

checkOptions();
