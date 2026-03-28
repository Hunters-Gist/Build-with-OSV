import express from 'express';
import Stripe from 'stripe';
import db from '../db/index.js';

const router = express.Router();

router.post('/create-session', async (req, res) => {
    try {
        const { quoteNum, depositAmount, clientName } = req.body;

        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({ error: 'Stripe Secret Key missing in backend/.env' });
        }

        // Initialize stripe directly dynamically to ensure the env var is read correctly 
        // if the server started before the key was populated.
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'aud',
                        product_data: {
                            name: `Build With OSVion Deposit: ${quoteNum}`,
                            description: `Securing phase 1 services for ${clientName}`,
                        },
                        unit_amount: Math.round(depositAmount * 100), // Stripe requires cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `https://osv-saa-s.vercel.app/client/quote/${quoteNum}?success=true`,
            cancel_url: `https://osv-saa-s.vercel.app/client/quote/${quoteNum}?canceled=true`,
            metadata: {
                quoteNum: quoteNum
            }
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error("Stripe Error:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
