const sessions = new Map();
const MAX_MESSAGES = 5;

function ensure(sessionId) {
  if (!sessions.has(sessionId)) sessions.set(sessionId, []);
  return sessions.get(sessionId);
}

function push(sessionId, role, content) {
  if (!sessionId) return [];
  const list = ensure(sessionId);
  list.push({ role, content: content.slice(0, 1200) });
  while (list.length > MAX_MESSAGES) list.shift();
  return list;
}

function get(sessionId) {
  if (!sessionId) return [];
  return ensure(sessionId);
}

export default {
  push,
  get,
};
