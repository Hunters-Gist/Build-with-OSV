import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function checkNumber() {
  const number = '+61485020333';
  try {
    const numbers = await client.incomingPhoneNumbers.list({ phoneNumber: number });
    if (numbers.length > 0) {
      console.log(`Number ${number} is linked to Trunk: ${numbers[0].trunkSid}`);
    } else {
      console.log('Number not found');
    }
  } catch (err) {
    console.error(err);
  }
}

checkNumber();
