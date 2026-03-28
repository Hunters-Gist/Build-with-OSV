import twilio from 'twilio';
try {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  const publicUrl = undefined;
  twiml.dial({
      recordingStatusCallback: `${publicUrl}/api/twilio/recording`
  });
  console.log('Success:', twiml.toString());
} catch(e) {
  console.error('Error:', e);
}
