import 'dotenv/config';
import twilio from 'twilio';

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function checkAccount() {
  const account = await twilioClient.api.v2010.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
  console.log(`Account Name: ${account.friendlyName}`);
  console.log(`Type: ${account.type}`); // Usually 'Trial' or 'Full'
  console.log(`Status: ${account.status}`);
  
  // Check Verified Caller IDs (needed for Trial accounts)
  const outgoingCallerIds = await twilioClient.validationRequests.list({ limit: 10 });
  const verifiedList = await twilioClient.outgoingCallerIds.list();
  
  console.log('\nVerified Caller IDs:');
  if (verifiedList.length === 0) console.log('  None found.');
  verifiedList.forEach(v => console.log(`  - ${v.phoneNumber}`));
}

checkAccount().catch(console.error);
