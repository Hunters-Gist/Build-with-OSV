import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
dotenv.config();

const anthropic = new Anthropic({
    apiKey: process.env.OPENROUTER_API_KEY || 'missing',
    baseURL: 'https://openrouter.ai/api',
});

async function run() {
    try {
        const parsed = {
            media_type: "image/png",
            data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" // 1x1 pixel PNG
        };
        const systemPrompt = "Extract JSON.";
        
        console.log("Sending to google/gemini-3-pro-preview via OpenRouter...");
        const msg = await anthropic.messages.create({
            model: "google/gemini-3-pro-preview",
            max_tokens: 1500,
            temperature: 0.1,
            system: systemPrompt,
            messages: [{
                role: "user",
                content: [
                    {
                        type: "image",
                        source: {
                            type: "base64",
                            media_type: parsed.media_type,
                            data: parsed.data
                        }
                    },
                    {
                        type: "text",
                        text: "Formulate the extraction JSON natively off this visual document."
                    }
                ]
            }]
        });
        
        console.log("SUCCESS:", msg.content[0].text);
    } catch (e) {
        console.error("RAW OPENROUTER ERROR:");
        console.error(e.message);
        if (e.response) {
            console.error(e.response.data);
        }
    }
}

run();
