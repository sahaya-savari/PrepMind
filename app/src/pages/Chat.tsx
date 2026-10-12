import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useExam } from '../context/ExamContext';
import { useAuth } from '../hooks/useAuth';
import {
  MessageSquare,
  Sparkles,
  RotateCcw,
  Download,
  Trash2,
  AlertCircle,
  Square,
  Terminal,
  User,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Layers,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { ThoughtLine } from '../components/reactbits/ThoughtLine';
import { SlingButton } from '../components/reactbits/SlingButton';
import { CodeBlock } from '../components/shared/CodeBlock';
import { MarkdownView } from '../components/shared/MarkdownView';
import { askStream, ChatMessage } from '../api';
import {
  fetchUserDocuments,
  retrieveGroundedPassages,
  StudyDocument,
  Citation,
} from '../lib/rag';

const STORAGE_KEY = 'prepmind_chat_v2';
const MAX_HISTORY = 15;

const SUGGESTION_CHIPS = [
  'Explain how the JavaScript event loop handles microtasks vs macrotasks',
  'What is the fundamental trade-off between optimistic and pessimistic concurrency?',
  'How does B-Tree indexing speed up relational database queries under the hood?',
  'Walk through consistent hashing with virtual nodes and rebalancing',
];

export interface ChatMessageWithRag extends ChatMessage {
  citations?: Citation[];
  isGrounded?: boolean;
}

// Helper to split message content into text and code blocks
interface ContentPart {
  type: 'text' | 'code';
  content: string;
  lang?: string;
  filename?: string;
}

const parseMessageParts = (raw: string): ContentPart[] => {
  const parts: ContentPart[] = [];
  const codeBlockRegex = /```([a-zA-Z0-9_\-\.]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      const text = raw.substring(lastIndex, match.index).trim();
      if (text) parts.push({ type: 'text', content: text });
    }
    const lang = match[1] || 'typescript';
    const filename = lang.includes('.') ? lang : undefined;
    parts.push({
      type: 'code',
      content: match[2].trim(),
      lang: filename ? filename.split('.').pop() : lang,
      filename,
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < raw.length) {
    const text = raw.substring(lastIndex).trim();
    if (text) parts.push({ type: 'text', content: text });
  }

  if (parts.length === 0 && raw) {
    parts.push({ type: 'text', content: raw });
  }

  return parts;
};

function Chat() {
  const { exam } = useExam();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMessageWithRag[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    try {
      return JSON.parse(saved) as ChatMessageWithRag[];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trimmed, setTrimmed] = useState(false);
  const [lastPrompt, setLastPrompt] = useState('');

  // RAG States
  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [useRag, setUseRag] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string>('all');
  const [retrievalNotice, setRetrievalNotice] = useState<string | null>(null);
  const [expandedCitationKey, setExpandedCitationKey] = useState<string | null>(null);

  const cancelRef = useRef(false);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Load study documents for user
  useEffect(() => {
    if (user?.id) {
      fetchUserDocuments(user.id)
        .then((docs) => {
          setDocuments(docs);
          const hasReady = docs.some((d) => d.status === 'ready');
          if (hasReady) {
            setUseRag(true);
          }
        })
        .catch(() => {});
    }
  }, [user?.id]);

  const trimHistory = (list: ChatMessageWithRag[]) => {
    if (list.length <= MAX_HISTORY) return list;
    setTrimmed(true);
    return list.slice(list.length - MAX_HISTORY);
  };

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const handlePromptClick = (promptText: string) => {
    setInput(promptText);
    inputRef.current?.focus();
  };

  const readyDocs = documents.filter((d) => d.status === 'ready');

  const sendMessage = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const content = input.trim();
    if (!content || loading) return;

    cancelRef.current = false;
    const userMsg: ChatMessageWithRag = { role: 'user', content };
    const next = trimHistory([...messages, userMsg]);
    setMessages(next);
    setInput('');
    setLoading(true);
    setError('');
    setRetrievalNotice(null);
    setLastPrompt(content);

    // 1. Perform RAG retrieval if enabled
    let currentCitations: Citation[] = [];
    let groundedPrompt = content;

    if (useRag && user?.id && readyDocs.length > 0) {
      try {
        const docFilter = selectedDocId === 'all' ? undefined : [selectedDocId];
        const { passages, citations } = await retrieveGroundedPassages(content, user.id, docFilter);

        if (passages.length > 0) {
          currentCitations = citations;
          const contextBlock = passages
            .map(
              (p, i) =>
                `[Retrieved Source ${i + 1} (${p.document_name || 'Study Notes'}, Page ${p.page_number || 1})]:\n${p.chunk_text}`
            )
            .join('\n\n');

          groundedPrompt = `You are the PrepMind AI Technical Tutor. Answer the candidate's query using strictly the retrieved study passages below as ground truth.\n\n${contextBlock}\n\nCandidate Query: ${content}\n\nGrounding Rule: Cite the specific document name and page number when stating facts. If the retrieved material does not cover the answer, state that your uploaded study materials do not contain sufficient evidence to answer this query instead of speculating.`;
        } else {
          setRetrievalNotice(
            'No direct matches found in your uploaded materials for this query. The AI tutor answered using general domain knowledge.'
          );
        }
      } catch (ragErr: any) {
        console.warn('[PrepMind] RAG retrieval error:', ragErr);
      }
    }

    try {
      let acc = '';
      setMessages((prev) =>
        trimHistory([
          ...prev,
          {
            role: 'assistant',
            content: '...',
            citations: currentCitations.length > 0 ? currentCitations : undefined,
            isGrounded: currentCitations.length > 0,
          },
        ])
      );

      const promptWithExamContext =
        exam && exam !== 'Target Syllabus'
          ? `[Target Exam: ${exam}]\n${groundedPrompt}`
          : groundedPrompt;

      await askStream(promptWithExamContext, 'chat', (chunk) => {
        if (cancelRef.current) return;
        acc += chunk;
        setMessages((prev) => {
          const merged = trimHistory([...prev]);
          const existing = merged[merged.length - 1];
          if (existing?.role === 'assistant') {
            merged[merged.length - 1] = {
              role: 'assistant',
              content: acc,
              citations: currentCitations.length > 0 ? currentCitations : undefined,
              isGrounded: currentCitations.length > 0,
            };
          } else {
            merged.push({
              role: 'assistant',
              content: acc,
              citations: currentCitations.length > 0 ? currentCitations : undefined,
              isGrounded: currentCitations.length > 0,
            });
          }
          return merged;
        });
      });
    } catch (err: any) {
      setError(`AI service notice: ${err?.message || 'Failed to complete streaming response'}`);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'assistant' && last.content === '...') {
          return prev.slice(0, prev.length - 1);
        }
        return prev;
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelStream = () => {
    cancelRef.current = true;
    setLoading(false);
    setError('Streaming stopped by user');
  };

  const clearChat = () => {
    setMessages([]);
    setError('');
    setRetrievalNotice(null);
    setTrimmed(false);
  };

  const exportChat = () => {
    const blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prepmind_chat_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const retryLast = () => {
    if (lastPrompt) {
      setInput(lastPrompt);
      sendMessage();
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* 1. CHAT HEADER */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              AI Study Assistant
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--accent)]">
              {exam || 'Target Syllabus'}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Real-time Socratic dialogue, conceptual proofs, and grounded study material retrieval (RAG).
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={exportChat}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
              title="Export chat history as JSON"
            >
              <Download size={13} />
              <span>Export</span>
            </button>
          )}

          <button
            type="button"
            onClick={clearChat}
            disabled={messages.length === 0}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--error)] hover:border-[var(--error)]/40 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Clear all messages"
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>
        </div>
      </header>

      {/* 2. RAG CONTEXT CONTROL BAR */}
      <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-[var(--text-primary)] select-none">
            <input
              type="checkbox"
              checked={useRag}
              onChange={(e) => setUseRag(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] accent-[var(--accent)] cursor-pointer"
            />
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Ask My Study Materials (RAG)</span>
            </span>
          </label>

          {useRag && readyDocs.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-[var(--text-muted)]">Source:</span>
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="text-xs bg-[var(--surface)] border border-[var(--border)] rounded-md px-2 py-1 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-mono"
              >
                <option value="all">All Indexed Materials ({readyDocs.length})</option>
                {readyDocs.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {useRag && readyDocs.length === 0 && (
            <span className="text-[11px] font-mono text-[var(--warning)] flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>No indexed documents yet</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => navigate('/materials')}
          className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[var(--accent)] hover:underline self-end sm:self-center"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Knowledge Library ({documents.length})</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </button>
      </div>

      {/* Notifications */}
      {retrievalNotice && (
        <div className="text-xs p-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--accent)]/30 text-[var(--accent)] flex items-center gap-2">
          <BookOpen size={14} className="shrink-0" />
          <span>{retrievalNotice}</span>
        </div>
      )}

      {error && (
        <div className="text-xs p-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--warning)]/40 text-[var(--warning)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
          {lastPrompt && (
            <button
              type="button"
              onClick={retryLast}
              className="inline-flex items-center gap-1 underline font-semibold hover:text-[var(--text-primary)] ml-2 cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}

      {trimmed && (
        <div className="text-xs text-[var(--warning)] bg-[var(--surface-elevated)] border border-[var(--warning)]/20 p-2 rounded-lg">
          Conversation context optimized to the latest {MAX_HISTORY} messages for performance.
        </div>
      )}

      {/* 3. MESSAGE STREAM CONTAINER */}
      <div
        ref={chatRef}
        className="min-h-[420px] max-h-[64vh] overflow-y-auto p-4 sm:p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-4"
      >
        {messages.length === 0 && (
          <div className="py-10 px-4 text-center space-y-5">
            <div className="w-12 h-12 mx-auto rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--accent)]">
              <MessageSquare size={22} />
            </div>
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                What concept would you like to explore today?
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto">
                Request algorithmic proofs, debug code snippets, or query your uploaded course materials.
              </p>
            </div>

            {/* Starter Suggestion Chips */}
            <div className="grid gap-2.5 sm:grid-cols-2 max-w-2xl mx-auto pt-2 text-left">
              {SUGGESTION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handlePromptClick(chip)}
                  className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] hover:border-[var(--accent)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all text-left leading-relaxed flex items-center justify-between group cursor-pointer"
                >
                  <span className="line-clamp-2">{chip}</span>
                  <span className="text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1.5 font-bold">
                    →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          const parts = parseMessageParts(m.content);

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[92%] sm:max-w-[84%] px-4 py-3.5 rounded-xl border text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-[var(--surface-elevated)] border-[var(--accent)]/40 text-[var(--text-primary)] rounded-br-sm'
                    : 'bg-[var(--surface-elevated)] border-[var(--border-strong)] text-[var(--text-primary)] rounded-bl-sm'
                }`}
              >
                {!isUser ? (
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border)] text-[11px] font-mono">
                    <div className="flex items-center gap-2 font-semibold text-[var(--accent)]">
                      <Terminal className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span>PrepMind AI Tutor</span>
                    </div>

                    {m.isGrounded && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[var(--positive)] font-mono border border-[var(--positive)]/30 bg-[var(--positive)]/10 px-1.5 py-0.5 rounded">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>RAG Grounded</span>
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 pb-1 mb-1 text-[11px] font-mono text-[var(--text-muted)]">
                    <User className="w-3 h-3" />
                    <span>You</span>
                  </div>
                )}

                <div className="space-y-2">
                  {parts.map((p, pIdx) => {
                    if (p.type === 'code') {
                      return (
                        <CodeBlock
                          key={pIdx}
                          code={p.content}
                          language={p.lang || 'typescript'}
                          filename={p.filename}
                        />
                      );
                    }
                    return <MarkdownView key={pIdx} content={p.content} />;
                  })}
                </div>

                {/* Grounded Citations Display */}
                {!isUser && m.citations && m.citations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-[var(--border)] space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-[var(--accent)]" />
                      <span>Retrieved Source Citations ({m.citations.length}):</span>
                    </span>

                    <div className="flex flex-wrap gap-1.5">
                      {m.citations.map((cite, cIdx) => {
                        const citeKey = `${idx}_${cIdx}`;
                        const isExpanded = expandedCitationKey === citeKey;

                        return (
                          <div key={cIdx} className="space-y-1">
                            <button
                              type="button"
                              onClick={() => setExpandedCitationKey(isExpanded ? null : citeKey)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[10px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors cursor-pointer"
                            >
                              <span>
                                {cite.document_title} (p.{cite.page_number || 1})
                              </span>
                              {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                            </button>

                            {isExpanded && (
                              <div className="p-2 rounded bg-[var(--surface)] border border-[var(--accent)]/30 text-[11px] text-[var(--text-secondary)] font-mono leading-relaxed max-w-md">
                                <span className="text-[var(--accent)] font-semibold">Passage Evidence:</span>{' '}
                                &ldquo;{cite.snippet}&rdquo;
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {idx === messages.length - 1 && !isUser && loading && (
                  <span className="inline-block w-1.5 h-3.5 ml-1 bg-[var(--accent)] animate-pulse align-middle" />
                )}
              </div>
            </motion.div>
          );
        })}

        {loading && (
          <div className="pt-2">
            <ThoughtLine
              working={true}
              label={
                useRag && readyDocs.length > 0
                  ? 'Retrieving study passages & formulating grounded answer...'
                  : 'Streaming Socratic response...'
              }
              steps={[
                'Parsing technical query',
                useRag && readyDocs.length > 0 ? 'Searching vector embeddings' : 'Synthesizing architectural reasoning',
                'Streaming formulated explanation',
              ]}
            />
          </div>
        )}
      </div>

      {/* 4. INPUT COMPOSER WITH SLINGBUTTON */}
      <form
        onSubmit={sendMessage}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              if (input.trim() && !loading) sendMessage();
            }
          }}
          rows={3}
          className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] text-xs sm:text-sm resize-none"
          placeholder={
            useRag && readyDocs.length > 0
              ? 'Ask anything from your uploaded study materials (Ctrl + Enter to send)...'
              : 'Ask a conceptual derivation, algorithm trade-off, or proof (Ctrl + Enter to send)...'
          }
          aria-label="Ask study tutor"
          disabled={loading}
        />

        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-[11px] font-mono text-[var(--text-muted)] hidden sm:inline">
            Press{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-elevated)] border border-[var(--border)] text-[10px] text-[var(--text-secondary)]">
              Ctrl + Enter
            </kbd>{' '}
            to send
          </span>

          <div className="flex items-center gap-2">
            {loading && (
              <button
                type="button"
                onClick={cancelStream}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold bg-[var(--surface-elevated)] border border-[var(--error)]/40 text-[var(--error)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
              >
                <Square size={12} />
                <span>Stop</span>
              </button>
            )}

            <SlingButton
              onSend={() => sendMessage()}
              disabled={loading || !input.trim()}
              isSending={loading}
              label="Send Message"
              aria-label="Send message to AI Tutor"
            />
          </div>
        </div>
      </form>
    </div>
  );
}

export default Chat;
