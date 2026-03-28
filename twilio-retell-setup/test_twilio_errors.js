import 'dotenv/config';
import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function checkErrors() {
  const alerts = await client.monitor.v1.alerts.list({ limit: 10 });
  if (alerts.length === 0) {
    console.log("No recent alerts found.");
  }
  alerts.forEach(a => {
    console.log(`[${a.dateGenerated}] Error ${a.errorCode}: ${a.logLevel} | ${a.alertText}`);
  });
}
checkErrors().catch(console.error);
