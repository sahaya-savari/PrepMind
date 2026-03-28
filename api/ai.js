export default async function handler(req, res) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (req.method === 'OPTIONS') {
    res.status(200).set(corsHeaders).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).set(corsHeaders).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).set(corsHeaders).json({ error: 'Server misconfigured: missing GEMINI_API_KEY' });
    return;
  }

  const body = req.body || {};
  const model = body.model || 'models/gemini-2.5-flash';
  const msgCount = Array.isArray(body.messages) ? body.messages.length : 0;
  const systemMsg = body.messages?.find(m => m.role === 'system');

  console.log('[api/ai] incoming request', { model, msgCount });

  try {
    // Call Gemini's native Generative Language API (key passed as query param)
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        contents: (body.messages || [])
          .filter(m => m.role !== 'system')
          .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          })),
        systemInstruction: systemMsg
          ? {
              role: 'user',
              parts: [{ text: systemMsg.content }]
            }
          : undefined,
        generationConfig: {
          temperature: typeof body.temperature === 'number' ? body.temperature : 1,
          topP: typeof body.top_p === 'number' ? body.top_p : 1,
          maxOutputTokens: typeof body.max_tokens === 'number' ? body.max_tokens : 1200
        }
      })
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      const snippet = (errText || '').slice(0, 600);
      console.error('[api/ai] upstream error', upstream.status, snippet);
      res.status(upstream.status).set(corsHeaders).json({ error: { message: `Upstream ${upstream.status}: ${snippet}` } });
      return;
    }

    const data = await upstream.json();
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    // Return in the minimal shape the frontend expects (OpenAI-like choices array)
    res.status(200).set(corsHeaders).json({
      choices: [
        {
          message: { content: text }
        }
      ]
    });
  } catch (e) {
    console.error('[api/ai] exception', e?.message || e);
    res.status(500).json({ error: e?.message || 'Proxy error' });
  }
}
