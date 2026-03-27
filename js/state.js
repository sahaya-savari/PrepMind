const STATE = {
  exam: '',
  topics: [],
  overview: null,
  selectedTopic: '',
  selectedDiff: 'easy',
  questions: [],
  score: { total: 0, correct: 0 },
  topicStats: {},
  chatHistory: [],
  generatingQ: false,
  generatingTeach: {},
  notesText: '',
  notesChunks: [],
  notesMeta: {
    chunkSize: 700,
    overlap: 120,
    lastUpdated: null,
    totalChars: 0
  },
  rag: {
    enabled: true,
    topK: 3,
    minScore: 0.25,
    maxContextChars: 1800
  },
  lastRetrieval: {
    query: '',
    matches: 0,
    topScore: 0
  }
};

function ensureStateDefaults() {
  if (!STATE.notesText) STATE.notesText = '';
  if (!Array.isArray(STATE.notesChunks)) STATE.notesChunks = [];

  if (!STATE.notesMeta || typeof STATE.notesMeta !== 'object') {
    STATE.notesMeta = {};
  }
  if (typeof STATE.notesMeta.chunkSize !== 'number') STATE.notesMeta.chunkSize = 700;
  if (typeof STATE.notesMeta.overlap !== 'number') STATE.notesMeta.overlap = 120;
  if (!STATE.notesMeta.lastUpdated) STATE.notesMeta.lastUpdated = null;
  if (typeof STATE.notesMeta.totalChars !== 'number') STATE.notesMeta.totalChars = 0;

  if (!STATE.rag || typeof STATE.rag !== 'object') {
    STATE.rag = {};
  }
  if (typeof STATE.rag.enabled !== 'boolean') STATE.rag.enabled = true;
  if (typeof STATE.rag.topK !== 'number') STATE.rag.topK = 3;
  if (typeof STATE.rag.minScore !== 'number') STATE.rag.minScore = 0.25;
  if (typeof STATE.rag.maxContextChars !== 'number') STATE.rag.maxContextChars = 1800;

  if (!STATE.lastRetrieval || typeof STATE.lastRetrieval !== 'object') {
    STATE.lastRetrieval = {};
  }
  if (!STATE.lastRetrieval.query) STATE.lastRetrieval.query = '';
  if (typeof STATE.lastRetrieval.matches !== 'number') STATE.lastRetrieval.matches = 0;
  if (typeof STATE.lastRetrieval.topScore !== 'number') STATE.lastRetrieval.topScore = 0;
}

function saveState() {
  localStorage.setItem('prepmind_state', JSON.stringify(STATE));
}

function loadState() {
  const saved = localStorage.getItem('prepmind_state');
  if (saved) {
    try {
      Object.assign(STATE, JSON.parse(saved));
    } catch(e) {
      console.warn('Failed to load local state:', e);
    }
  }
}

// Load state immediately upon initialization
loadState();
ensureStateDefaults();

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const CORS_PROXIES = [
  'https://corsproxy.io/?url=',
  'https://api.allorigins.win/raw?url='
];
let currentProxy = 0;

let API_KEY = localStorage.getItem('prepmind_api_key') || '';

if (!API_KEY) {
  const entered = (typeof prompt !== 'undefined') ? prompt('Enter your GitHub-compatible API token (no scopes needed):', '') : '';
  if (entered && entered.trim()) {
    API_KEY = entered.trim();
    try { localStorage.setItem('prepmind_api_key', API_KEY); } catch(_) {}
  }
}

const MODEL = 'gemini-2.5-flash';