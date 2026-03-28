import 'dotenv/config';
import twilio from 'twilio';

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function checkCalls() {
  console.log('Fetching recent calls from Twilio...');
  try {
    const calls = await twilioClient.calls.list({ limit: 10 });
    calls.forEach(c => {
      console.log(`[${c.dateCreated}] Call ${c.sid}:`);
      console.log(`  From: ${c.from} To: ${c.to}`);
      console.log(`  Direction: ${c.direction}`);
      console.log(`  Status: ${c.status}`);
      if (c.price) console.log(`  Price: ${c.price}`);
      if (c.errorMessage) console.log(`  Error Message: ${c.errorMessage}`);
      if (c.errorCode) console.log(`  Error Code: ${c.errorCode}`);
      console.log('------------------------------');
    });
  } catch (error) {
    console.error("Error fetching calls:", error);
  }
}

checkCalls().catch(console.error);
