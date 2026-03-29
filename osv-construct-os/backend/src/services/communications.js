import { Resend } from 'resend';
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config();

// Gracefully instantiate or map to dummy strings so the server runs even if env variables are empty initially.
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID || 'ACdummy', process.env.TWILIO_AUTH_TOKEN || 'dummy');

export const sendQuoteEmail = async ({ clientEmail, clientName, quoteNum, totalValue, portalUrl }) => {
    // Failsafe sandbox simulation if keys aren't mounted in backend/.env yet
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'dummy_key_for_now') {
        console.warn("Resend API Key missing. Simulating email dispatch.");
        return { success: true, simulated: true };
    }
    
    try {
        const { data, error } = await resend.emails.send({
            from: 'Build With OSV <noreply@buildwithosv.com.au>', // DNS records must be verified in Resend dashboard
            to: [clientEmail],
            subject: `Action Required: Quote ${quoteNum} Ready for Review`,
            html: `
<!DOCTYPE html>
<html>
<head>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;900&family=Barlow:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body style="background-color: #0b0c0f; margin: 0; padding: 40px 0;">
    <div style="font-family: 'Barlow', sans-serif; max-width: 600px; margin: 0 auto; background: #0b0c0f; color: #ffffff; padding: 40px; border-radius: 8px; border: 1px solid #1a1c23;">
        <h1 style="font-family: 'Barlow Condensed', sans-serif; color: #f5a623; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 2px; font-weight: 900; font-size: 32px;">Build With OSV</h1>
        <h3 style="font-family: 'Barlow Condensed', sans-serif; color: #888; margin-top: 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Intelligent Quote Formulated</h3>
        
        <div style="background: #111318; border: 1px solid #2a2d36; padding: 40px; border-radius: 6px; margin-top: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
            <p style="font-size: 18px; line-height: 1.6; color: #e2e8f0; font-weight: 600;">Hi ${clientName},</p>
            <p style="font-size: 16px; line-height: 1.8; color: #cbd5e1;">Your estimated build quote for <strong style="color: #f5a623; font-size: 18px;">$${totalValue}</strong> has been successfully engineered and is ready for your review.</p>
            <p style="font-size: 16px; line-height: 1.8; color: #cbd5e1;">Please review your complete interactive scope breakdown and explicitly secure your phase 1 build milestones directly through our secure OSV Client Portal below.</p>
            
            <div style="text-align: center; margin-top: 35px; margin-bottom: 15px;">
                <a href="${portalUrl || `https://osv-saa-s.vercel.app/client/quote/${quoteNum}`}" style="display: inline-block; background-color: #22c55e; color: #0b0c0f; padding: 18px 36px; text-decoration: none; font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 18px; text-transform: uppercase; letter-spacing: 2px; border-radius: 4px; border: 1px solid #16a34a;">Access Secure Active Quote</a>
            </div>
        </div>
        
        <div style="margin-top: 30px; text-align: center; border-top: 1px solid #1a1c23; padding-top: 20px;">
            <p style="font-family: 'Barlow Condensed', sans-serif; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px;">Powered by OSV Delivery Command</p>
        </div>
    </div>
</body>
</html>
            `
        });

        if (error) throw error;
        return { success: true, data };
    } catch (err) {
        console.error("Transactional Email Error:", err);
        return { success: false, error: err.message };
    }
};

export const sendSubbieDispatchSMS = async ({ subbiePhone, subbieName, jobNum, trade }) => {
    if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID === 'dummy_key_for_now') {
        console.warn("Twilio Keys missing. Simulating SMS subbie dispatch.");
        return { success: true, simulated: true };
    }
    
    try {
        const msg = await twilioClient.messages.create({
            body: `[OSV Forge]: Hi ${subbieName}, you have been actively assigned to an upcoming ${trade} operational job (${jobNum}). Please check your OSV Partner Dashboard to review the scope logic immediately.`,
            from: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
            to: subbiePhone
        });
        return { success: true, messageId: msg.sid };
    } catch (err) {
        console.error("Twilio SMS Dispatch Error:", err);
        return { success: false, error: err.message };
    }
};
