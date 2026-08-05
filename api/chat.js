// Vercel Serverless Function — proxy ke Groq API
// API key dibaca dari Vercel Environment Variables (tidak pernah ke client)
const Groq = require('groq-sdk');

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Hanya izinkan POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
        return res.status(500).json({ error: 'Server configuration error: API key not set' });
    }

    try {
        const groq = new Groq({ apiKey: GROQ_API_KEY });

        const { model, messages, temperature, max_tokens } = req.body;

        const completion = await groq.chat.completions.create({
            model: model || 'llama-3.1-8b-instant',
            messages,
            temperature: temperature ?? 0.6,
            max_tokens: max_tokens ?? 450,
        });

        return res.status(200).json(completion);
    } catch (err) {
        const status = err.status || 500;
        const message = err.message || 'Internal server error';
        return res.status(status).json({ error: { message } });
    }
}
