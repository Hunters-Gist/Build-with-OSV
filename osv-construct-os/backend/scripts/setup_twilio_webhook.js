import 'dotenv/config';
import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const numberSid = 'PN31fafff26833b37ba91dffcb68ac519a';
const trunkSid = 'TK11e6be58c0cb914ac6688324bc782f42';
const webhookUrl = 'https://osv-construct-backend.onrender.com/api/twilio/recording_callback';

async function setTrunk() {
  try {
    console.log(`Reverting Twilio Number ${numberSid} to SIP Trunk...`);
    const updated = await client.incomingPhoneNumbers(numberSid).update({
      trunkSid: trunkSid, // Back to SIP Trunk routing
      voiceUrl: '', // Must clear TwiML VoiceUrl for Trunk to work
      statusCallback: webhookUrl,
      statusCallbackMethod: 'POST',
      statusCallbackEvent: ['completed']
    });
    console.log(`Successfully mapped +61 485 020 333 to Trunk ${trunkSid} and added StatusCallback!`);
  } catch (err) {
    console.error('Error updating Twilio Number:', err);
  }
}
setTrunk();
