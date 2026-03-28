import 'dotenv/config';
import twilio from 'twilio';
import { Retell } from 'retell-sdk';

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const retell = new Retell({ apiKey: process.env.RETELL_API_KEY });

async function setup() {
  const number = process.env.TWILIO_PHONE_NUMBER;
  const destNumber = process.env.DESTINATION_PHONE_NUMBER;
  console.log(`Setting up ${number} to map to Retell...`);

  try {
    // 1. Setup SIP Trunk in Twilio
    const trunks = await twilioClient.trunking.v1.trunks.list({ limit: 50 });
    let trunk = trunks.find(t => t.friendlyName === 'Retell AI Trunk');
    if (!trunk) {
      console.log('Creating SIP Trunk...');
      trunk = await twilioClient.trunking.v1.trunks.create({
        friendlyName: 'Retell AI Trunk',
        domainName: `retell-${Date.now()}.pstn.twilio.com`,
        secure: true,
        transferMode: 'enable-all'
      });
    }
    const trunkSid = trunk.sid;
    console.log(`SIP Trunk SID: ${trunkSid}, Domain: ${trunk.domainName}`);

    // Update trunk configuration to enable Call Transfers (SIP REFER)
    // Using from-transferor bypasses caller ID spoofing restrictions for outbound PSTN legs
    await twilioClient.trunking.v1.trunks(trunkSid).update({ 
      transferMode: 'enable-all',
      transferCallerId: 'from-transferor'
    });
    console.log(`Verified Trunk: ${trunkSid} allows SIP REFER transfers`);

    // Wait! Let's also attach Retell's IP to the Twilio SIP trunk Access Control List automatically so bridge_transfer works flawlessly
    let acl;
    const acls = await twilioClient.sip.ipAccessControlLists.list({ limit: 50 });
    acl = acls.find(a => a.friendlyName === 'Retell IPs');
    if (!acl) {
      acl = await twilioClient.sip.ipAccessControlLists.create({ friendlyName: 'Retell IPs' });
      await twilioClient.sip.ipAccessControlLists(acl.sid).ipAddresses.create({ friendlyName: 'Retell 1', ipAddress: '18.98.16.120', cidrPrefixLength: 30 });
    }
    // Bind ACL to Trunk
    try {
      await twilioClient.trunking.v1.trunks(trunkSid).ipAccessControlLists.create({ ipAccessControlListSid: acl.sid });
      console.log('Attached Retell IP ACL to Twilio SIP Trunk');
    } catch (e) {
      if (e.code === 21245) {
        // 21245 is the Twilio error code for "ACL already associated with Trunk"
        // We can safely ignore this as it means it's already correct.
      } else {
        throw e;
      }
    }

    // Create Origination URL on Trunk to route to Retell
    const existingUris = await twilioClient.trunking.v1.trunks(trunkSid).originationUrls.list();
    if (existingUris.length === 0) {
      console.log('Configuring Origination URL to sip.retellai.com...');
      await twilioClient.trunking.v1.trunks(trunkSid).originationUrls.create({
        weight: 1,
        priority: 1,
        enabled: true,
        friendlyName: 'Retell Inbound',
        sipUrl: 'sip:sip.retellai.com'
      });
    }

    // Assign Phone Number to Trunk
    console.log('Assigning phone number to SIP Trunk...');
    const twilioNumbers = await twilioClient.incomingPhoneNumbers.list({ phoneNumber: number });
    if (twilioNumbers.length > 0) {
      const pnSid = twilioNumbers[0].sid;
      await twilioClient.incomingPhoneNumbers(pnSid).update({ trunkSid: trunkSid, voiceUrl: '' });
      console.log(`Assigned ${number} to Trunk ${trunkSid}`);
    } else {
      console.log(`Could not find active Twilio number: ${number}`);
    }

    // 2. Create Retell LLM with a Transfer Call tool
    console.log('Creating Retell LLM...');
    const prompt = `You are Jaque's assistant at On Site Visuals, a Melbourne-based construction and media company.
You are professional, polite, efficient, and speak with a friendly, natural tone. 

About On Site Visuals:
- Built by a founder (Jaque / Gillian J. Bazerque) with over a decade of residential construction experience.
- Build With OSV: High-quality residential trade services (structural carpentry, landscaping, full-scope renovations, property upgrades). Operates through a vetted subcontractor network with precision and structured quoting.
- Onsite Visuals Media: Converts completed projects into strategic high-quality visual content to drive new business.
- Core philosophy: Great work delivered through a great system. Structured, accountable, and built to solve industry problems like inconsistent pricing and poor communication.

Your task:
1. Greet the caller professionally (e.g. "Hi, you've reached On Site Visuals. I'm Jaque's assistant. How can I help you today?").
2. Listen to their intent or record their name and reason for calling.
3. If they ask basic questions about the business, answer them concisely based on your knowledge. 
4. When transferring to Jaque, DO NOT say "I will use the transfer tool." Simply say "Please hold on a moment while I get Jaque for you," and then IMMEDIATELY trigger the 'transfer_to_jaque' tool function.

CRITICAL: Your only way to transfer is by successfully executing the 'transfer_to_jaque' native tool. Do not narrate your actions out loud.`;

    const llm = await retell.llm.create({
      model: 'gpt-4o',
      model_temperature: 0.1,
      general_prompt: prompt,
      states: [
        {
          name: 'initial',
          state_prompt: 'Greet caller, answer queries briefly, and transfer them securely to Jaque. Say "Please hold on" and instantly invoke the transfer_to_jaque function natively. DO NOT narrate that you are using a tool.',
          tools: [
            {
              type: 'bridge_transfer',
              name: 'transfer_to_jaque',
              description: 'Transfer the call to Jaque.',
              transfer_destination: destNumber
            }
          ]
        }
      ],
      starting_state: 'initial'
    });
    console.log(`Retell LLM created: ${llm.llm_id}`);

    // 3. Create Retell Agent
    console.log('Creating Retell Agent...');
    const agent = await retell.agent.create({
      response_engine: {
        type: 'retell-llm',
        llm_id: llm.llm_id
      },
      voice_id: '11labs-Willa',
      agent_name: 'Jaque Assistant (On Site Visuals)',
      enable_backchannel: true,
      normalize_for_speech: true,
      interruption_sensitivity: 0.9,
      end_call_after_silence_ms: 15000
    });
    console.log(`Retell Agent created: ${agent.agent_id}`);

    // 4. Import Phone Number to Retell
    console.log('Importing Phone Number to Retell...');
    try {
      const importedNum = await retell.phoneNumber.import({
        phone_number: number,
        termination_uri: trunk.domainName,
        inbound_agent_id: agent.agent_id
      });
      console.log('Successfully imported phone number to Retell!');
      console.log('Phone Number details:', importedNum);
    } catch (e) {
      console.warn('Import failed. Number might already be imported or trunk configuration is incomplete:', e.message);
    }
    
    console.log('\nSetup complete! Your number', number, 'will now forward to', destNumber, 'and handle recording/transcription via Retell.');

  } catch (err) {
    console.error('Setup failed:', err);
  }
}

setup();
