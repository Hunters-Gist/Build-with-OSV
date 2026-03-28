import 'dotenv/config';
import twilio from 'twilio';
import { Retell } from 'retell-sdk';

const retell = new Retell({ apiKey: process.env.RETELL_API_KEY });
const agentId = 'agent_a2b04c40621bd59ff0876a07c9';

async function updateAgent() {
  const destNumber = '+61451477293';

  try {
    console.log(`Retrieving Agent ${agentId}...`);
    const agent = await retell.agent.retrieve(agentId);
    
    // Safety check just in case it doesn't use Retell LLM yet
    let llmId = agent.response_engine?.llm_id;
    if (!llmId && agent.response_engine?.type !== 'retell-llm') {
       console.log("Agent doesn't have a Retell LLM engine currently attached. We'll create one.");
       // Note: To be totally safe we can just create a new LLM and attach it
       const newLlm = await retell.llm.create({
         model: 'gpt-4o',
         general_prompt: 'placeholder',
         states: [{ name: 'initial', state_prompt: 'placeholder', tools: [] }],
         starting_state: 'initial'
       });
       llmId = newLlm.llm_id;
    }

    console.log(`Updating Retell LLM (${llmId}) with strict tool dispatch programming...`);
    const prompt = `You are a Customer Service Consultant at On Site Visuals, a Melbourne-based construction and media company.
You are professional, polite, efficient, and speak with a friendly, natural tone. 

About On Site Visuals:
- Built by a founder (Jaque / Gillian J. Bazerque) with over a decade of residential construction experience.
- Build With OSV: High-quality residential trade services (structural carpentry, landscaping, full-scope renovations, property upgrades). Operates through a vetted subcontractor network with precision and structured quoting.
- Onsite Visuals Media: Converts completed projects into strategic high-quality visual content to drive new business.
- Core philosophy: Great work delivered through a great system. Structured, accountable, and built to solve industry problems like inconsistent pricing and poor communication.

Your task:
1. Greet the caller professionally (e.g. "Hi, you've reached On Site Visuals. I'm a Customer Service Consultant. How can I help you today?").
2. Listen to their intent or record their name and reason for calling.
3. If they ask basic questions about the business, answer them concisely based on your knowledge. 
4. When transferring the call, DO NOT say "I will use the transfer tool." Simply say "Please hold on a moment while I transfer you," and then IMMEDIATELY execute the tool to transfer the call.

CRITICAL: Your only way to transfer is by successfully executing the native transfer tool call provided to you. Do not narrate your actions out loud.`;

    const updatedLlm = await retell.llm.update(llmId, {
      model: 'gpt-4o',
      model_temperature: 0.1,
      general_prompt: prompt,
      states: [
        {
          name: 'initial',
          state_prompt: 'Greet caller, answer queries briefly, and transfer them securely to our staff. Say "Please hold on" and instantly invoke the transfer function natively.',
          tools: [
            {
              type: 'transfer_call',
              name: 'transfer_call_to_staff',
              description: 'Transfer the call to the relevant staff. Call this immediately when the user wants to speak to someone.',
              transfer_destination: {
                type: 'predefined',
                number: `sip:${destNumber}@retell-1773977356561.pstn.twilio.com`
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
    console.log(`Updated LLM: ${updatedLlm.llm_id}`);

    console.log('Updating Retell Agent details...');
    const updatedAgent = await retell.agent.update(agentId, {
      response_engine: {
        type: 'retell-llm',
        llm_id: updatedLlm.llm_id
      },
      voice_id: '11labs-Willa',
      agent_name: 'Customer Service Consultant (On Site Visuals)',
      enable_backchannel: true,
      normalize_for_speech: true,
      interruption_sensitivity: 0.9,
      end_call_after_silence_ms: 15000
    });
    console.log(`Updated Agent: ${updatedAgent.agent_id}`);
    console.log('Successfully applied all changes for the Customer Service Consultant!');
  } catch (error) {
    console.error('Failed to update agent:', error);
  }
}

updateAgent();
