import 'dotenv/config';
import { Retell } from 'retell-sdk';

const retell = new Retell({ apiKey: process.env.RETELL_API_KEY });
async function checkLlm() {
  const llm = await retell.llm.retrieve('llm_0160d91b5218e3a680bb29ff7524');
  console.log(JSON.stringify(llm, null, 2));
}
checkLlm().catch(console.error);
