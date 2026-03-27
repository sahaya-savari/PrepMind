function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function extractJSON(str) {
  try {
    const match = str.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return JSON.parse(str);
  } catch (e) {
    throw new Error('Failed to parse JSON response: ' + e.message);
  }
}

function getProxiedURL() {
  return CORS_PROXIES[currentProxy] + encodeURIComponent(API_BASE);
}

const APICache = JSON.parse(localStorage.getItem('ai_cache')) || {};

async function fetchFromGemini(messages, systemPrompt = '', maxTokens = 1200) {
  const msgs = [];
  if (systemPrompt) {
    msgs.push({ role: 'system', content: systemPrompt });
  }
  msgs.push(...messages);

  const body = {
    model: MODEL,
    messages: msgs,
    temperature: 1,
    max_tokens: maxTokens,
    top_p: 1
  };

  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error (${res.status})`);
    }
    const data = await res.json();
    return data.choices[0].message.content;
  } catch(e) {
    throw new Error(e.message || 'Failed to connect to AI API. Check your connection and token.');
  }
}

async function aiAPI(messages, systemPrompt = '', maxTokens = 1200) {
  const payloadStr = systemPrompt + JSON.stringify(messages);
  const cacheKey = 'c_' + payloadStr.length + '_' + payloadStr.replace(/[^a-zA-Z0-9]/g, '').slice(-50);

  if (APICache[cacheKey]) {
    console.log('⚡ Using cached AI response');
    return APICache[cacheKey];
  }

  const response = await fetchFromGemini(messages, systemPrompt, maxTokens);
  
  APICache[cacheKey] = response;
  try {
    localStorage.setItem('ai_cache', JSON.stringify(APICache));
  } catch (e) {
    console.warn('Cache quota exceeded, ignoring cache save.');
  }
  
  return response;
}