import 'dotenv/config';

async function enableInboundRecording() {
  const inboundTrunkSid = 'TK11e6be58c0cb914ac6688324bc782f42';
  try {
    const auth = Buffer.from(process.env.TWILIO_ACCOUNT_SID + ':' + process.env.TWILIO_AUTH_TOKEN).toString('base64');
    const res = await fetch(`https://trunking.twilio.com/v1/Trunks/${inboundTrunkSid}/Recording`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        Mode: 'record-from-answer',
        Trim: 'trim-silence'
      })
    });
    const data = await res.json();
    console.log('Successfully enabled recording via REST:', data.mode);
  } catch (err) {
    console.error('Error enabling recording via REST:', err);
  }
}

enableInboundRecording();
