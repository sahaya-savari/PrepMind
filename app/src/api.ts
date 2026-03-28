export type AIMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export async function aiAPI(messages: AIMessage[]): Promise<string> {
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.error?.message || err?.error || `Request failed (${res.status})`;
      throw new Error(msg);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text || typeof text !== 'string') {
      throw new Error('Empty response from AI');
    }
    return text.trim();
  } catch (e: any) {
    console.error('aiAPI error', e);
    throw new Error(e?.message || 'Unexpected error');
  }
}
