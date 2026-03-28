import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { AIMessage, aiAPI } from '../api';
import { useAuth } from '../hooks/useAuth';

type LocationState = {
  exam?: string;
  overview?: string;
};

const STORAGE_KEY = 'prepmind_state';

function Chat() {
  const location = useLocation();
  const locState = (location.state || {}) as LocationState;
  const { data, setExamOverview, saveChatHistory } = useAuth();

  const [exam, setExam] = useState(locState.exam || '');
  const [overview, setOverview] = useState(locState.overview || '');
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const chatRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (exam && messages.length) return;
    if (data.exam) {
      setExam(data.exam);
      setOverview(data.overview);
      setMessages(data.chatHistory || []);
      return;
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setExam(parsed.exam || '');
        setOverview(parsed.overview || '');
      } catch (e) {
        console.warn('Failed to parse stored state', e);
      }
    }
  }, [exam, data.exam, data.overview, data.chatHistory, messages.length]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const systemPrompt = useMemo(() => {
    const base = 'You are a concise exam tutor. Keep replies brief and actionable.';
    return overview ? `${base} Exam overview: ${overview}` : base;
  }, [overview]);

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (!exam) {
      setError('Set an exam on Home first.');
      return;
    }

    const userMsg: AIMessage = { role: 'user', content: input.trim() };
    const draftMessages = [...messages, userMsg];

    setMessages(draftMessages);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const resp = await aiAPI([{ role: 'system', content: systemPrompt }, ...draftMessages]);
      const nextMessages = [...draftMessages, { role: 'assistant', content: resp }];
      setMessages(nextMessages);
      setExamOverview(exam, overview);
      saveChatHistory(nextMessages);
    } catch (err: any) {
      setError(err?.message || 'Failed to send message.');
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError('');
    saveChatHistory([]);
  };

  const hasExam = Boolean(exam);

  return (
    <section className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Chat Tutor</h2>
          <p className="text-gray-600 text-sm">Ask doubts; responses are notes-aware when overview exists.</p>
        </div>
        <button className="soft-button" onClick={clearChat} disabled={loading}>
          Clear
        </button>
      </header>

      {!hasExam && (
        <div className="card-surface p-5 text-sm text-white">
          Please set an exam on <Link to="/" className="text-blue-200">Home</Link> first.
        </div>
      )}

      {hasExam && overview && (
        <div className="card-surface p-4 text-xs text-white/80">
          Context loaded for: <span className="text-white font-semibold">{exam}</span>
        </div>
      )}

      {error && <div className="text-sm text-red-400">{error}</div>}

      <div ref={chatRef} className="card-surface p-5 h-[420px] overflow-y-auto space-y-3 scroll-smooth">
        {messages.length === 0 && <div className="text-white/80 text-sm">Say hi to start the tutor.</div>}
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`max-w-[88%] text-sm px-4 py-3 rounded-2xl shadow-lg transition-all duration-200 ${
              m.role === 'user'
                ? 'ml-auto bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                : 'mr-auto bg-white/80 text-gray-900'
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && <LoadingSpinner label="Thinking" />}
      </div>

      <form onSubmit={sendMessage} className="card-surface p-4 flex gap-3 items-center sticky bottom-20 sm:bottom-4">
        <textarea
          className="w-full resize-none px-3 py-3 rounded-xl bg-white/80 text-gray-900 placeholder:text-gray-500 shadow-lg focus:ring-4 focus:ring-blue-300 focus:outline-none"
          rows={2}
          placeholder="Type a question"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading || !hasExam}
        />
        <button
          type="submit"
          className="soft-button px-4 py-3"
          disabled={loading || !hasExam}
        >
          Send
        </button>
      </form>
    </section>
  );
}

export default Chat;
