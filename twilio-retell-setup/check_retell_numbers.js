import 'dotenv/config';
import { Retell } from 'retell-sdk';

const retell = new Retell({ apiKey: process.env.RETELL_API_KEY });

async function checkNumbers() {
  try {
    const numbers = await retell.phoneNumber.list();
    console.log(JSON.stringify(numbers, null, 2));
  } catch (error) {
    console.error("Error fetching Retell numbers:", error);
  }
}

checkNumbers().catch(console.error);
