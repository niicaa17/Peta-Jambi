// Vercel Serverless Function — proxy ke Groq API
// API key dibaca dari Vercel Environment Variables (tidak pernah ke client)
export default async function handler(req, res) {
    // Hanya izinkan POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
        return res.status(500).json({ error: 'Server configuration error: API key not set' });
    }

    try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify(req.body)
        });

        const data = await groqRes.json();

        if (!groqRes.ok) {
            return res.status(groqRes.status).json(data);
        }

        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
}
