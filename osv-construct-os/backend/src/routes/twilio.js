import express from 'express';
import twilio from 'twilio';
import { Resend } from 'resend';
import db from '../db/index.js';
import { logSecurityAuditEvent } from '../services/securityAudit.js';

const router = express.Router();
const VoiceResponse = twilio.twiml.VoiceResponse;
const shouldEnforceTwilioSignature = String(process.env.ENFORCE_TWILIO_SIGNATURE || 'false').toLowerCase() === 'true';

function verifyTwilioSignature(req, pathOverride = null) {
    if (!shouldEnforceTwilioSignature) return { ok: true };
    const signature = req.headers['x-twilio-signature'];
    if (!signature) return { ok: false, status: 401, error: 'Missing Twilio signature header.', reason: 'missing_twilio_signature' };
    if (!process.env.TWILIO_AUTH_TOKEN) {
        return { ok: false, status: 500, error: 'TWILIO_AUTH_TOKEN is required when signature verification is enabled.', reason: 'missing_twilio_auth_token' };
    }

    const baseUrl = process.env.PUBLIC_API_BASE_URL || 'https://osv-construct-backend.onrender.com';
    const path = pathOverride || req.originalUrl;
    const fullUrl = `${baseUrl}${path}`;
    const isValid = twilio.validateRequest(
        process.env.TWILIO_AUTH_TOKEN,
        String(signature),
        fullUrl,
        req.body || {}
    );

    if (!isValid) return { ok: false, status: 401, error: 'Invalid Twilio request signature.', reason: 'invalid_twilio_signature' };
    return { ok: true };
}

// 1. Initial Inbound VoIP Webhook (Only used if Twilio Number uses VoiceWebhook instead of SIP Trunk)
router.post('/voice', (req, res) => {
    try {
        const signatureCheck = verifyTwilioSignature(req, '/api/twilio/voice');
        if (!signatureCheck.ok) {
            logSecurityAuditEvent(db, req, {
                source: 'twilio',
                eventType: 'signature_validation',
                outcome: 'denied',
                reason: signatureCheck.reason || signatureCheck.error
            });
            return res.status(signatureCheck.status || 401).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Unauthorized callback.</Say></Response>');
        }

        const twiml = new VoiceResponse();
        const fromNumber = req.body?.From || 'Unknown';
        console.log(`[Twilio Webhook] Incoming call from ${fromNumber}`);
        
        // We use Twilio <Dial> with bridging. This ensures Twilio records the ENTIRE call.
        const publicUrl = 'https://osv-construct-backend.onrender.com';
        const dial = twiml.dial({
            record: 'record-from-answer',
            recordingStatusCallback: `${publicUrl}/api/twilio/recording_callback`,
            recordingStatusCallbackEvent: 'completed',
            timeout: 20
        });
        dial.sip('sip:sip.retellai.com');
        res.type('text/xml');
        res.send(twiml.toString());
    } catch (err) {
        console.error("Twilio Voice Webhook Error:", err.message);
        res.type('text/xml');
        res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, an application error occurred while connecting your call.</Say></Response>');
    }
});

// 2. Recording / Call Status Callback
router.post('/recording_callback', async (req, res) => {
    const signatureCheck = verifyTwilioSignature(req, '/api/twilio/recording_callback');
    if (!signatureCheck.ok) {
        logSecurityAuditEvent(db, req, {
            source: 'twilio',
            eventType: 'signature_validation',
            outcome: 'denied',
            reason: signatureCheck.reason || signatureCheck.error
        });
        return res.status(signatureCheck.status || 401).send('Unauthorized');
    }

    const payload = req.body;
    // Always return 200 OK immediately so Twilio doesn't block or retry
    res.status(200).send('OK');

    try {
        let recordingUrl = payload.RecordingUrl;
        let duration = payload.RecordingDuration;
        let callSid = payload.CallSid;

        // If this is a CallStatus=completed webhook (from SIP Trunking), RecordingUrl isn't provided directly in the payload!
        if (payload.CallStatus === 'completed' && !recordingUrl) {
            console.log(`[Twilio Webhook] Call ${callSid} completed. Waiting for recording to finalize...`);
            
            // Wait 10 seconds for Twilio to process the trunk recording
            await new Promise(r => setTimeout(r, 10000));
            
            const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            let recordings = await client.recordings.list({ callSid: callSid });
            
            if (recordings.length === 0) {
                console.log(`No recordings found instantly for Call ${callSid}. Waiting another 15s...`);
                await new Promise(r => setTimeout(r, 15000));
                recordings = await client.recordings.list({ callSid: callSid });
            }

            if (recordings.length === 0) {
                console.warn(`Still no recordings found for Call ${callSid}. Giving up.`);
                return;
            }

            // Grab the main recording
            recordingUrl = "https://api.twilio.com" + recordings[0].uri.replace('.json', '');
            duration = recordings[0].duration;
        }

        if (!recordingUrl) {
            console.log("No recording URL resolved. Exiting.");
            return;
        }

        console.log(`[Twilio Webhook] Processing Recording: ${recordingUrl}. Duration: ${duration}s`);
        
        if (!process.env.OPENROUTER_API_KEY) {
            console.warn("OpenRouter key missing. Skipping transcription.");
            return;
        }

        // 1. Download the MP3 audio file directly from Twilio
        const authHeader = 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
        const audioRes = await fetch(`${recordingUrl}.mp3`, {
            headers: { 'Authorization': authHeader }
        });
        
        if (!audioRes.ok) throw new Error(`Failed to fetch Twilio audio: ${audioRes.statusText}`);

        // 2. Convert raw stream to Base64 for OpenRouter
        const arrayBuffer = await audioRes.arrayBuffer();
        const base64Audio = Buffer.from(arrayBuffer).toString('base64');

        // 3. Send the Base64 audio to OpenRouter GPT-4o-Audio for transcription
        console.log('Sending audio to OpenRouter (gpt-4o-audio-preview) for transcription...');
        const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'openai/gpt-4o-audio-preview',
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Please transcribe the following phone conversation perfectly. Return ONLY the transcript.' },
                            { type: 'input_audio', input_audio: { data: base64Audio, format: 'mp3' } }
                        ]
                    }
                ]
            })
        });

        const orData = await orRes.json();
        const transcriptionText = orData.choices?.[0]?.message?.content || "Transcript could not be generated.";

        console.log('Transcription completed. Sending email via Resend...');

        // 4. Dispatch Email with Transcript and Audio Link
        const targetEmail = process.env.TWILIO_RECORDING_EMAIL || 'gerard@buildwithosv.com.au';
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
            from: 'OSV AI <onboarding@resend.dev>', // Upgrade to verified domain later
            to: targetEmail,
            subject: `New Call Transcript from ${payload.From || 'Unknown Caller'}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
                    <h2>New Call From: <strong>${payload.From || 'Unknown Caller'}</strong></h2>
                    <p><strong>Duration:</strong> ${duration} seconds</p>
                    <p><strong>Audio Link:</strong> <a href="${recordingUrl}.mp3" target="_blank">Listen to Call</a> 
                    <i>(Requires Twilio Dashboard login if security is enabled)</i></p>
                    <hr />
                    <h3>Full Transcript:</h3>
                    <p style="white-space: pre-wrap; background: #f4f4f4; padding: 15px; border-radius: 5px; font-size: 15px; line-height: 1.5;">${transcriptionText}</p>
                </div>
            `
        });

        console.log('Email successfully sent to', targetEmail);

    } catch (error) {
        console.error("Transcription/Webhook Error:", error);
    }
});

export default router;
