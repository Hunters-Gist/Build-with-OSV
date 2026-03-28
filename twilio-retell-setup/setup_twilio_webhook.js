import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const publicUrl = process.env.PUBLIC_BACKEND_URL;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER || '+61485020333';

if (!publicUrl || publicUrl.includes('your-ngrok-or-production-url')) {
  console.error('❌ ERROR: You must set PUBLIC_BACKEND_URL in your osv-construct-os/backend/.env file to your actual internet-accessible URL (e.g. ngrok or deployed server base URL).');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function setupWebhook() {
  try {
    const numbers = await client.incomingPhoneNumbers.list({ phoneNumber });
    if (numbers.length === 0) {
      throw new Error(`Could not find phone number ${phoneNumber} in your Twilio account.`);
    }
    
    const pnSid = numbers[0].sid;
    const webhookUrl = `${publicUrl.replace(/\/$/, '')}/api/twilio/voice`;

    console.log(`Updating Twilio Number ${phoneNumber} to use Voice Webhook: ${webhookUrl}`);
    
    // Disconnect trunkSid and wire up VoiceUrl
    await client.incomingPhoneNumbers(pnSid).update({
      trunkSid: '', // Detach from the trunk to allow TwiML to take precedence
      voiceUrl: webhookUrl,
      voiceMethod: 'POST'
    });

    console.log('✅ Successfully updated Twilio configuration! Your calls are now controlled by your backend TwiML with full call recording enabled.');

  } catch (error) {
    console.error('Setup Error:', error.message);
  }
}

setupWebhook();
