export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server misconfigured: missing GEMINI_API_KEY' });
    return;
  }

  const body = req.body || {};
  const model = body.model || 'unknown-model';
  const msgCount = Array.isArray(body.messages) ? body.messages.length : 0;

  console.log('[api/ai] incoming request', { model, msgCount });

  try {
    const upstream = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error('[api/ai] upstream error', upstream.status, errText);
      res.status(upstream.status).json({ error: errText || 'Upstream error' });
      return;
    }

    const data = await upstream.json();
    res.status(200).json(data);
  } catch (e) {
    console.error('[api/ai] exception', e?.message || e);
    res.status(500).json({ error: e?.message || 'Proxy error' });
  }
}
