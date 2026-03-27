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
  generatingTeach: {}
};

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

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const CORS_PROXIES = [
  'https://corsproxy.io/?url=',
  'https://api.allorigins.win/raw?url='
];
let currentProxy = 0;

let API_KEY = localStorage.getItem('prepmind_api_key') || 'AIzaSyD6FP729Huateu4hDLvCYytT3NPWHrxNuY';

const MODEL = 'gemini-2.5-flash';