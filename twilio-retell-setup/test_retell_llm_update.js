import 'dotenv/config';
import { Retell } from 'retell-sdk';

const retell = new Retell({ apiKey: process.env.RETELL_API_KEY });
async function testUpdate() {
  try {
    const updatedLlm = await retell.llm.update('llm_0160d91b5218e3a680bb29ff7524', {
      states: [
        {
          name: 'initial',
          state_prompt: 'Greet caller, answer queries briefly, and transfer them securely to Jaque. Say "Please hold on" and instantly invoke the transfer function natively.',
          tools: [
            {
              type: 'transfer_call',
              name: 'transfer_call_to_jaque',
              description: 'Transfer the call to Jaque.',
              transfer_destination: {
                type: 'predefined',
                number: 'sip:+61451477293@retell-osv-aus.pstn.twilio.com'
              },
              transfer_option: {
                type: 'cold_transfer'
              }
            }
          ]
        }
      ],
      starting_state: 'initial'
    });
    console.log(JSON.stringify(updatedLlm.states[0].tools, null, 2));
  } catch (error) {
    console.error("Failed to update:", error);
  }
}
testUpdate().catch(console.error);
