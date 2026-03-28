export default async function handler(req, res) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  const send = (status, payload) => res.status(status).set(corsHeaders).json(payload);

  if (req.method === 'OPTIONS') {
    res.status(200).set(corsHeaders).end();
    return;
  }

  if (req.method !== 'POST') {
    send(405, { error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    send(500, { error: 'Server misconfigured: missing GEMINI_API_KEY' });
    return;
  }

  const body = req.body || {};
  const messages = Array.isArray(body.messages) ? body.messages : [];

  if (!messages.length) {
    send(400, { error: 'Invalid request: messages array required' });
    return;
  }

  const sanitized = messages
    .filter(m => m && typeof m.role === 'string' && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.trim() }))
    .filter(m => m.content.length > 0);

  if (!sanitized.length) {
    send(400, { error: 'Invalid request: message content missing' });
    return;
  }

  const systemMsg = sanitized.find(m => m.role === 'system');
  const model = body.model || 'models/gemini-2.5-flash';
  console.log('[api/ai] incoming request', { model, msgCount: sanitized.length });

  try {
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        contents: sanitized
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
      send(upstream.status, { error: { message: `Upstream ${upstream.status}: ${snippet}` } });
      return;
    }

    const data = await upstream.json();
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    send(200, {
      choices: [
        {
          message: { content: text }
        }
      ]
    });
  } catch (e) {
    console.error('[api/ai] exception', e?.message || e);
    send(500, { error: e?.message || 'Proxy error' });
  }
}
