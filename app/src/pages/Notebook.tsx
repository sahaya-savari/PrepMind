import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Notebook,
  NotebookMessage,
  NotebookArtifact,
  ArtifactType,
  FlashcardItem,
  QuizQuestionItem,
  listNotebooks,
  createNotebook,
  updateNotebook,
  deleteNotebook,
  fetchNotebookMessages,
  saveNotebookMessage,
  clearNotebookMessages,
  fetchNotebookArtifacts,
  saveNotebookArtifact,
  deleteNotebookArtifact,
  generateGroundedLearningArtifact,
} from '../lib/notebook';
import {
  StudyDocument,
  DocumentChunk,
  Citation,
  fetchUserDocuments,
  uploadStudyDocument,
  deleteStudyDocument,
  retrieveGroundedPassages,
  fetchNotebookChunks,
} from '../lib/rag';
import { postJSON } from '../api';
import {
  Library,
  Plus,
  Trash2,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  MessageSquare,
  BookOpen,
  Layers,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Copy,
  Check,
  Download,
  X,
  HelpCircle,
  FileCode,
  Zap,
  Eye,
  Send,
  ExternalLink,
} from 'lucide-react';

export default function NotebookPage() {
  const { notebookId: routeNotebookId } = useParams<{ notebookId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // State: Notebooks
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [currentNotebook, setCurrentNotebook] = useState<Notebook | null>(null);
  const [loadingNotebooks, setLoadingNotebooks] = useState(true);

  // State: Create / Edit Notebook Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creatingNotebook, setCreatingNotebook] = useState(false);

  // State: Documents in current notebook
  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // State: Q&A Chat
  const [messages, setMessages] = useState<NotebookMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [sendingQuery, setSendingQuery] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // State: Citation Excerpt Inspector Modal
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);

  // State: Learning Studio & Artifacts
  const [artifacts, setArtifacts] = useState<NotebookArtifact[]>([]);
  const [activeArtifact, setActiveArtifact] = useState<NotebookArtifact | null>(null);
  const [generatingTool, setGeneratingTool] = useState<ArtifactType | null>(null);
  const [toolError, setToolError] = useState<string | null>(null);

  // State: Flashcard viewer
  const [cardIndex, setCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);

  // State: Quiz runner
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [submittedQuiz, setSubmittedQuiz] = useState(false);

  // State: Copy feedback
  const [copiedArtifactId, setCopiedArtifactId] = useState<string | null>(null);

  // Mobile navigation tabs: 'sources' | 'chat' | 'studio'
  const [mobileTab, setMobileTab] = useState<'sources' | 'chat' | 'studio'>('chat');

  // --------------------------------------------------------------------------
  // 1. LOAD NOTEBOOKS
  // --------------------------------------------------------------------------
  const loadUserNotebooks = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingNotebooks(true);
      const list = await listNotebooks(user.id);
      setNotebooks(list);

      // Match routeNotebookId or pick first
      if (routeNotebookId) {
        const found = list.find((n) => n.id === routeNotebookId);
        if (found) {
          setCurrentNotebook(found);
        } else if (list.length > 0) {
          setCurrentNotebook(list[0]);
          navigate(`/notebooks/${list[0].id}`, { replace: true });
        }
      } else if (list.length > 0) {
        setCurrentNotebook(list[0]);
        navigate(`/notebooks/${list[0].id}`, { replace: true });
      } else {
        setCurrentNotebook(null);
      }
    } catch (err) {
      console.warn('[PrepMind] Error loading notebooks:', err);
    } finally {
      setLoadingNotebooks(false);
    }
  }, [user, routeNotebookId, navigate]);

  useEffect(() => {
    loadUserNotebooks();
  }, [loadUserNotebooks]);

  // --------------------------------------------------------------------------
  // 2. LOAD NOTEBOOK CONTENTS (Docs, Messages, Artifacts)
  // --------------------------------------------------------------------------
  const loadNotebookContents = useCallback(async (nb: Notebook) => {
    if (!user) return;
    try {
      // 1. Documents
      const docs = await fetchUserDocuments(user.id, nb.id);
      setDocuments(docs);

      // 2. Messages
      setLoadingMessages(true);
      const msgs = await fetchNotebookMessages(nb.id, user.id);
      setMessages(msgs);

      // 3. Artifacts
      const arts = await fetchNotebookArtifacts(nb.id, user.id);
      setArtifacts(arts);
      if (arts.length > 0 && !activeArtifact) {
        setActiveArtifact(arts[0]);
      }
    } catch (err) {
      console.warn('[PrepMind] Error loading notebook content:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [user, activeArtifact]);

  useEffect(() => {
    if (currentNotebook) {
      loadNotebookContents(currentNotebook);
    } else {
      setDocuments([]);
      setMessages([]);
      setArtifacts([]);
      setActiveArtifact(null);
    }
  }, [currentNotebook, loadNotebookContents]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, sendingQuery]);

  // --------------------------------------------------------------------------
  // 3. NOTEBOOK CRUD
  // --------------------------------------------------------------------------
  const handleCreateNotebook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const cleanTitle = newTitle.trim();
    if (!cleanTitle) return;

    try {
      setCreatingNotebook(true);
      const created = await createNotebook(cleanTitle, newDesc, user.id);
      setNotebooks([created, ...notebooks]);
      setCurrentNotebook(created);
      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      navigate(`/notebooks/${created.id}`);
    } catch (err: any) {
      alert(err?.message || 'Could not create notebook.');
    } finally {
      setCreatingNotebook(false);
    }
  };

  const handleDeleteNotebook = async (nbId: string) => {
    if (!user || !window.confirm('Are you sure you want to delete this notebook and all its attached study notes?')) return;
    try {
      await deleteNotebook(nbId, user.id);
      const remaining = notebooks.filter((n) => n.id !== nbId);
      setNotebooks(remaining);
      if (remaining.length > 0) {
        setCurrentNotebook(remaining[0]);
        navigate(`/notebooks/${remaining[0].id}`);
      } else {
        setCurrentNotebook(null);
        navigate('/notebooks');
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to delete notebook.');
    }
  };

  // --------------------------------------------------------------------------
  // 4. DOCUMENT UPLOAD & MANAGEMENT
  // --------------------------------------------------------------------------
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !currentNotebook || uploadingDoc) return;

    setUploadError(null);
    setUploadingDoc(true);
    setUploadProgress(15);

    try {
      const doc = await uploadStudyDocument(
        file,
        user.id,
        (percent) => setUploadProgress(percent),
        currentNotebook.id
      );
      setDocuments((prev) => [doc, ...prev]);
    } catch (err: any) {
      setUploadError(err?.message || 'Document upload and chunking failed.');
    } finally {
      setUploadingDoc(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDocument = async (doc: StudyDocument) => {
    if (!user || !window.confirm(`Delete "${doc.title}" from this notebook?`)) return;
    try {
      await deleteStudyDocument(doc.id, doc.storage_path, user.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err: any) {
      alert(err?.message || 'Failed to delete document.');
    }
  };

  // --------------------------------------------------------------------------
  // 5. DOCUMENT-GROUNDED Q&A CHAT
  // --------------------------------------------------------------------------
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputQuery.trim();
    if (!query || !user || !currentNotebook || sendingQuery) return;

    setInputQuery('');
    setSendingQuery(true);

    // 1. Optimistic User Message
    const userMsg: NotebookMessage = {
      id: 'temp_' + Date.now(),
      notebook_id: currentNotebook.id,
      user_id: user.id,
      role: 'user',
      content: query,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      // 2. Persist user message
      await saveNotebookMessage({
        notebook_id: currentNotebook.id,
        user_id: user.id,
        role: 'user',
        content: query,
      });

      // 3. Grounded Passage Retrieval for this Notebook
      const readyDocIds = documents.filter((d) => d.status === 'ready').map((d) => d.id);
      const { passages, citations } = await retrieveGroundedPassages(
        query,
        user.id,
        readyDocIds,
        currentNotebook.id
      );

      // 4. Construct Socratic anti-hallucination prompt
      let systemInstruction = `You are PrepMind AI, an elite academic research mentor grounded strictly in the candidate's private notebook documents.
RULES:
1. Ground your answers ONLY in the provided verified passages from notebook "${currentNotebook.title}".
2. Cite sources explicitly using bracketed citations, e.g. [DocName, p. X].
3. If the provided passages do NOT contain sufficient evidence to answer the candidate's question, clearly state: "The attached notebook documents do not contain evidence regarding this topic." Do NOT fabricate information.`;

      let userPrompt = query;
      if (passages.length > 0) {
        const passageText = passages
          .map((p, idx) => `[PASSAGE ${idx + 1} | File: ${p.document_name || 'Doc'} | Page: ${p.page_number || 1}]:\n${p.chunk_text}`)
          .join('\n\n---\n\n');
        userPrompt = `VERIFIED PASSAGES FROM NOTEBOOK:\n${passageText}\n\nCANDIDATE QUESTION: ${query}`;
      } else {
        userPrompt = `(Note: No relevant passages matched this query in the notebook index.)\n\nCANDIDATE QUESTION: ${query}`;
      }

      // 5. Dispatch to AI orchestrator
      const aiRes = await postJSON<{ response: string }>('/api/ai', {
        action: 'chat',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt },
        ],
      });

      const responseContent = aiRes?.response || 'No response generated.';

      // 6. Save assistant message with verifiable citations
      const assistantMsg = await saveNotebookMessage({
        notebook_id: currentNotebook.id,
        user_id: user.id,
        role: 'assistant',
        content: responseContent,
        citations: citations.length > 0 ? citations : undefined,
      });

      setMessages((prev) => [...prev.filter((m) => m.id !== userMsg.id), userMsg, assistantMsg]);
    } catch (err: any) {
      const errorMsg: NotebookMessage = {
        id: 'err_' + Date.now(),
        notebook_id: currentNotebook.id,
        user_id: user.id,
        role: 'assistant',
        content: `Error generating response: ${err?.message || 'Service unavailable.'}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSendingQuery(false);
    }
  };

  const handleClearChat = async () => {
    if (!user || !currentNotebook || !window.confirm('Clear all conversation history in this notebook?')) return;
    try {
      await clearNotebookMessages(currentNotebook.id, user.id);
      setMessages([]);
    } catch (err: any) {
      alert(err?.message || 'Failed to clear chat.');
    }
  };

  const handleExportChat = () => {
    if (!messages.length) return;
    const content = messages
      .map((m) => `### ${m.role === 'user' ? 'Candidate' : 'PrepMind AI'}\n${m.content}\n\n`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentNotebook?.title || 'notebook'}-chat.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --------------------------------------------------------------------------
  // 6. LEARNING STUDIO SYNTHESIS TOOLS
  // --------------------------------------------------------------------------
  const handleGenerateTool = async (type: ArtifactType) => {
    if (!user || !currentNotebook) return;
    setToolError(null);
    setGeneratingTool(type);

    try {
      // 1. Fetch all passages for this notebook
      const chunks = await fetchNotebookChunks(user.id, currentNotebook.id);
      if (!chunks.length) {
        throw new Error('Please upload and index at least one document in this notebook before generating study materials.');
      }

      // 2. Synthesize artifact via notebook.ts & /api/rag
      const result = await generateGroundedLearningArtifact(type, currentNotebook.title, chunks);

      // 3. Save artifact
      const saved = await saveNotebookArtifact({
        notebook_id: currentNotebook.id,
        user_id: user.id,
        type,
        title: result.title,
        content: result.content,
      });

      setArtifacts((prev) => [saved, ...prev]);
      setActiveArtifact(saved);
      setCardIndex(0);
      setCardFlipped(false);
      setSelectedAnswers({});
      setSubmittedQuiz(false);

      // On mobile, switch to studio tab to see result
      setMobileTab('studio');
    } catch (err: any) {
      setToolError(err?.message || 'Synthesis failed. Please try again.');
    } finally {
      setGeneratingTool(null);
    }
  };

  const handleDeleteArtifact = async (artId: string) => {
    if (!user || !currentNotebook || !window.confirm('Delete this saved learning artifact?')) return;
    try {
      await deleteNotebookArtifact(artId, currentNotebook.id, user.id);
      const remaining = artifacts.filter((a) => a.id !== artId);
      setArtifacts(remaining);
      if (activeArtifact?.id === artId) {
        setActiveArtifact(remaining[0] || null);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to delete artifact.');
    }
  };

  const handleCopyArtifact = (art: NotebookArtifact) => {
    let text = '';
    if (art.content.text) {
      text = art.content.text;
    } else if (art.content.flashcards) {
      text = art.content.flashcards.map((f, i) => `Q${i + 1}: ${f.question}\nA: ${f.answer}\n`).join('\n');
    } else if (art.content.quiz) {
      text = art.content.quiz
        .map((q, i) => `Q${i + 1}: ${q.question}\nOptions: ${q.options.join(', ')}\nAnswer: ${q.answer}\nExplanation: ${q.explanation}\n`)
        .join('\n');
    }
    navigator.clipboard.writeText(text);
    setCopiedArtifactId(art.id);
    setTimeout(() => setCopiedArtifactId(null), 2000);
  };

  // --------------------------------------------------------------------------
  // RENDER: LOADING STATE
  // --------------------------------------------------------------------------
  if (loadingNotebooks) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin mb-3" />
        <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--text-muted)] font-mono">
          Loading Private Research Workspaces...
        </h2>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: NO NOTEBOOKS YET (ONBOARDING SCREEN)
  // --------------------------------------------------------------------------
  if (!notebooks.length) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 sm:p-12 text-center shadow-lg relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-[var(--surface-hover)] border border-[var(--border-strong)] flex items-center justify-center mx-auto mb-6 text-[var(--accent)]">
            <Library className="w-8 h-8" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-3">
            Private AI Research Notebooks
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-muted)] max-w-xl mx-auto mb-8 leading-relaxed">
            Inspired by NotebookLM. Create private workspaces grounded strictly in your syllabus PDFs, lecture notes, and research materials. Chat with verifiable source citations and generate 1-click revision notes, interactive flashcards, and drills.
          </p>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] text-white font-medium text-sm hover:opacity-90 active:scale-95 transition-all shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <Plus className="w-4 h-4" />
            Create Your First Notebook
          </button>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">Create Research Notebook</h2>
              <p className="text-xs text-[var(--text-muted)] mb-5">
                Organize your documents around a specific course, exam track, or topic.
              </p>

              <form onSubmit={handleCreateNotebook} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-1.5 font-mono">
                    Notebook Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AWS Solutions Architect, GATE CS Algorithms"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-1.5 font-mono">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of the research goals or modules covered..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingNotebook || !newTitle.trim()}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {creatingNotebook ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Create Notebook
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: MAIN NOTEBOOK WORKSPACE (3 PANELS)
  // --------------------------------------------------------------------------
  return (
    <div className="max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6 py-4 flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Top Bar: Notebook Switcher & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border)] mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--surface)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--accent)] shadow-sm shrink-0">
            <Library className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <select
                value={currentNotebook?.id}
                onChange={(e) => {
                  const selected = notebooks.find((n) => n.id === e.target.value);
                  if (selected) {
                    setCurrentNotebook(selected);
                    navigate(`/notebooks/${selected.id}`);
                  }
                }}
                className="font-bold text-base sm:text-lg text-[var(--text-primary)] bg-transparent border-none outline-none cursor-pointer hover:text-[var(--accent)] transition-colors pr-2"
              >
                {notebooks.map((nb) => (
                  <option key={nb.id} value={nb.id} className="bg-[var(--surface)] text-[var(--text-primary)]">
                    {nb.title}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                title="Create New Notebook"
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-[var(--text-muted)] font-mono -mt-0.5">
              {documents.filter((d) => d.status === 'ready').length} sources indexed •{' '}
              {artifacts.length} learning artifacts
            </p>
          </div>
        </div>

        {/* Right Header Action Items */}
        <div className="flex items-center gap-2">
          {currentNotebook && (
            <button
              type="button"
              onClick={() => handleDeleteNotebook(currentNotebook.id)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs transition-colors"
              title="Delete Notebook"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}

          <Link
            to="/materials"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">All Materials</span>
          </Link>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex lg:hidden items-center justify-around border-b border-[var(--border)] mb-4 text-xs font-medium">
        <button
          type="button"
          onClick={() => setMobileTab('sources')}
          className={`py-2 px-3 border-b-2 flex items-center gap-1.5 ${
            mobileTab === 'sources'
              ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
              : 'border-transparent text-[var(--text-muted)]'
          }`}
        >
          <FileText className="w-4 h-4" />
          Sources ({documents.length})
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('chat')}
          className={`py-2 px-3 border-b-2 flex items-center gap-1.5 ${
            mobileTab === 'chat'
              ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
              : 'border-transparent text-[var(--text-muted)]'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Grounded Q&A
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('studio')}
          className={`py-2 px-3 border-b-2 flex items-center gap-1.5 ${
            mobileTab === 'studio'
              ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
              : 'border-transparent text-[var(--text-muted)]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Studio ({artifacts.length})
        </button>
      </div>

      {/* 3-COLUMN WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-start">
        {/* ==================================================================== */}
        {/* PANEL 1: SOURCES & DOCUMENTS (Left Column - 3 cols)                  */}
        {/* ==================================================================== */}
        <div
          className={`lg:col-span-3 lg:flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 ${
            mobileTab === 'sources' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold tracking-wider uppercase text-[var(--text-primary)] font-mono flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[var(--accent)]" />
              Sources ({documents.length})
            </h2>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingDoc}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--accent)] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity min-h-[36px] sm:min-h-[32px] cursor-pointer"
            >
              {uploadingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>Upload</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md"
              onChange={handleDocumentUpload}
              className="hidden"
            />
          </div>

          {/* Upload Progress Bar */}
          {uploadingDoc && (
            <div className="p-3 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5">
              <div className="flex items-center justify-between text-[11px] text-[var(--accent)] mb-1 font-mono">
                <span>Vectorizing & Chunking...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-[var(--surface-hover)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {uploadError && (
            <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Document List */}
          <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
            {documents.length === 0 ? (
              <div className="border border-dashed border-[var(--border)] rounded-lg p-6 text-center">
                <FileCode className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-60" />
                <p className="text-xs font-medium text-[var(--text-primary)] mb-1">No Sources Attached</p>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mb-3">
                  Upload PDFs, notes, or syllabi to ground this notebook's AI responses.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-[var(--accent)] hover:underline font-mono"
                >
                  + Add PDF or Notes
                </button>
              </div>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="group relative rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 hover:border-[var(--accent)]/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate" title={doc.title}>
                        {doc.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--text-muted)] font-mono">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                            doc.status === 'ready'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : doc.status === 'processing'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {doc.status === 'ready' && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {doc.status === 'processing' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                          {doc.status === 'failed' && <AlertCircle className="w-2.5 h-2.5" />}
                          {doc.status.toUpperCase()}
                        </span>
                        <span>{doc.page_count ? `${doc.page_count} pgs` : `${Math.round(doc.file_size / 1024)} KB`}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc)}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-2 sm:p-1 text-rose-400 hover:bg-rose-500/10 rounded transition-opacity min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer"
                      title="Remove Document"
                      aria-label={`Remove ${doc.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ==================================================================== */}
        {/* PANEL 2: GROUNDED Q&A CHAT (Center Column - 5 cols)                  */}
        {/* ==================================================================== */}
        <div
          className={`lg:col-span-5 lg:flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] h-[75vh] min-h-[500px] overflow-hidden ${
            mobileTab === 'chat' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg)]/50">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[var(--accent)]" />
              <h2 className="text-xs font-bold tracking-wider uppercase text-[var(--text-primary)] font-mono">
                Document-Grounded Q&A
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleExportChat}
                    title="Export Markdown Notes"
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleClearChat}
                    title="Clear Conversation"
                    className="p-1 text-[var(--text-muted)] hover:text-rose-400 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--text-muted)]">
                <div className="w-12 h-12 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                  Ask Anything About Your Notes
                </p>
                <p className="text-xs max-w-sm leading-relaxed mb-4">
                  Every answer cites verifiable excerpts directly from your attached documents.
                </p>

                {documents.length > 0 && (
                  <div className="w-full max-w-xs space-y-2 text-left">
                    <button
                      type="button"
                      onClick={() => setInputQuery('Summarize the core themes and key formulas in these notes')}
                      className="w-full text-left text-xs p-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)] text-[var(--text-primary)] transition-colors"
                    >
                      "Summarize the core themes & key formulas"
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputQuery('What are the critical definitions and common exam traps?')}
                      className="w-full text-left text-xs p-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)] text-[var(--text-primary)] transition-colors"
                    >
                      "What are the critical definitions and exam traps?"
                    </button>
                  </div>
                )}
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[var(--accent)] text-white font-medium'
                        : 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {/* Citations Pills */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-[var(--border)]/60">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--accent)] mb-1.5 flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          Verifiable Sources ({msg.citations.length}):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.citations.map((cite, cIdx) => (
                            <button
                              key={cIdx}
                              type="button"
                              onClick={() => setActiveCitation(cite)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-strong)] text-[10px] font-mono text-[var(--text-primary)] transition-colors text-left"
                            >
                              <Eye className="w-2.5 h-2.5 text-[var(--accent)]" />
                              <span className="truncate max-w-[120px]">{cite.document_title}</span>
                              {cite.page_number && <span className="text-[var(--text-muted)]">p.{cite.page_number}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {sendingQuery && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-mono p-2">
                <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                <span>Retrieving evidence and synthesizing grounded response...</span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-[var(--border)] bg-[var(--bg)]/80">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={
                  documents.length === 0
                    ? 'Upload documents to enable grounded Q&A...'
                    : 'Ask questions grounded in your documents...'
                }
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                disabled={sendingQuery || documents.length === 0}
                className="flex-1 px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={sendingQuery || !inputQuery.trim() || documents.length === 0}
                className="p-2.5 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* ==================================================================== */}
        {/* PANEL 3: LEARNING STUDIO & TOOLS (Right Column - 4 cols)             */}
        {/* ==================================================================== */}
        <div
          className={`lg:col-span-4 lg:flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 h-[75vh] min-h-[500px] overflow-hidden ${
            mobileTab === 'studio' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Studio Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-[var(--accent)]" />
              <h2 className="text-xs font-bold tracking-wider uppercase text-[var(--text-primary)] font-mono">
                Learning Studio
              </h2>
            </div>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">1-Click AI Synthesis</span>
          </div>

          {/* Studio 1-Click Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleGenerateTool('summary')}
              disabled={generatingTool !== null || documents.length === 0}
              className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)] text-left transition-all disabled:opacity-50 group"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                {generatingTool === 'summary' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                Summary
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Executive overview</p>
            </button>

            <button
              type="button"
              onClick={() => handleGenerateTool('notes')}
              disabled={generatingTool !== null || documents.length === 0}
              className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)] text-left transition-all disabled:opacity-50 group"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                {generatingTool === 'notes' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookOpen className="w-3.5 h-3.5" />}
                Revision Notes
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">High-yield bullets</p>
            </button>

            <button
              type="button"
              onClick={() => handleGenerateTool('flashcards')}
              disabled={generatingTool !== null || documents.length === 0}
              className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)] text-left transition-all disabled:opacity-50 group"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                {generatingTool === 'flashcards' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                Flashcards
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Interactive recall</p>
            </button>

            <button
              type="button"
              onClick={() => handleGenerateTool('quiz')}
              disabled={generatingTool !== null || documents.length === 0}
              className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)] text-left transition-all disabled:opacity-50 group"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                {generatingTool === 'quiz' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <HelpCircle className="w-3.5 h-3.5" />}
                Practice Quiz
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Grounded MCQ drill</p>
            </button>
          </div>

          {toolError && (
            <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{toolError}</span>
            </div>
          )}

          {/* Active Artifact Viewer Area */}
          <div className="flex-1 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
            {activeArtifact ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)]">{activeArtifact.title}</h3>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase">
                      {activeArtifact.type} • {new Date(activeArtifact.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyArtifact(activeArtifact)}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded"
                      title="Copy to Clipboard"
                    >
                      {copiedArtifactId === activeArtifact.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteArtifact(activeArtifact.id)}
                      className="p-1 text-[var(--text-muted)] hover:text-rose-400 rounded"
                      title="Delete Artifact"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Sub-renderer: Flashcards Deck */}
                {activeArtifact.type === 'flashcards' && activeArtifact.content.flashcards ? (
                  <div className="space-y-3">
                    {(() => {
                      const deck = activeArtifact.content.flashcards || [];
                      const currentCard = deck[cardIndex] || deck[0];
                      if (!currentCard) return <p className="text-xs text-[var(--text-muted)]">No flashcards found.</p>;

                      return (
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono mb-2">
                            <span>Card {cardIndex + 1} of {deck.length}</span>
                            <button
                              type="button"
                              onClick={() => setCardFlipped(!cardFlipped)}
                              className="text-[var(--accent)] hover:underline flex items-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3" /> Flip Card
                            </button>
                          </div>

                          {/* Flip Card Element */}
                          <div
                            onClick={() => setCardFlipped(!cardFlipped)}
                            className="min-h-[140px] p-4 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] cursor-pointer flex flex-col justify-center text-center transition-all hover:border-[var(--accent)]"
                          >
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--accent)] mb-2">
                              {cardFlipped ? 'ANSWER' : 'QUESTION'}
                            </span>
                            <p className="text-xs sm:text-sm font-medium text-[var(--text-primary)] leading-relaxed">
                              {cardFlipped ? currentCard.answer : currentCard.question}
                            </p>
                          </div>

                          {/* Prev / Next controls */}
                          <div className="flex items-center justify-between mt-3">
                            <button
                              type="button"
                              disabled={cardIndex === 0}
                              onClick={() => {
                                setCardIndex((i) => Math.max(0, i - 1));
                                setCardFlipped(false);
                              }}
                              className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={cardIndex >= deck.length - 1}
                              onClick={() => {
                                setCardIndex((i) => Math.min(deck.length - 1, i + 1));
                                setCardFlipped(false);
                              }}
                              className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : activeArtifact.type === 'quiz' && activeArtifact.content.quiz ? (
                  /* Sub-renderer: Practice Quiz */
                  <div className="space-y-4">
                    {activeArtifact.content.quiz.map((q, qIdx) => {
                      const userPick = selectedAnswers[qIdx];
                      const isCorrect = userPick && userPick.trim().toLowerCase() === q.answer.trim().toLowerCase();

                      return (
                        <div key={qIdx} className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs">
                          <p className="font-semibold text-[var(--text-primary)] mb-2">
                            {qIdx + 1}. {q.question}
                          </p>

                          <div className="space-y-1.5">
                            {q.options.map((opt, optIdx) => {
                              const isPicked = userPick === opt;
                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  onClick={() => setSelectedAnswers((prev) => ({ ...prev, [qIdx]: opt }))}
                                  className={`w-full text-left p-2 rounded-md border text-[11px] transition-colors ${
                                    isPicked
                                      ? 'border-[var(--accent)] bg-[var(--accent)]/10 font-medium'
                                      : 'border-[var(--border)] hover:bg-[var(--surface-hover)]'
                                  }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>

                          {userPick && (
                            <div className="mt-2.5 pt-2 border-t border-[var(--border)] text-[11px] leading-relaxed">
                              <span className={isCorrect ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                                {isCorrect ? '✓ Correct! ' : `✗ Expected: ${q.answer}. `}
                              </span>
                              <span className="text-[var(--text-muted)]">{q.explanation}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Sub-renderer: Markdown text (Summary / Notes / Guide) */
                  <div className="text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                    {activeArtifact.content.text}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[var(--text-muted)]">
                <Sparkles className="w-8 h-8 text-[var(--accent)] mb-2 opacity-60" />
                <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">Studio Ready</p>
                <p className="text-[11px] leading-relaxed">
                  Click Summary, Revision Notes, Flashcards, or Practice Quiz to generate study materials from this notebook.
                </p>
              </div>
            )}
          </div>

          {/* Artifacts History Accordion / List */}
          {artifacts.length > 1 && (
            <div className="pt-2 border-t border-[var(--border)]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">
                Saved Artifacts ({artifacts.length})
              </span>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {artifacts.map((art) => (
                  <button
                    key={art.id}
                    type="button"
                    onClick={() => {
                      setActiveArtifact(art);
                      setCardIndex(0);
                      setCardFlipped(false);
                      setSelectedAnswers({});
                    }}
                    className={`px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap border transition-colors ${
                      activeArtifact?.id === art.id
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] font-semibold'
                        : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {art.type.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODAL 1: CREATE NEW NOTEBOOK                                         */}
      {/* ==================================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">Create Research Notebook</h2>
            <p className="text-xs text-[var(--text-muted)] mb-5">
              Organize your documents around a specific course or topic.
            </p>

            <form onSubmit={handleCreateNotebook} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-1.5 font-mono">
                  Notebook Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AWS Solutions Architect, GATE CS Algorithms"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-1.5 font-mono">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief description of the research goals..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingNotebook || !newTitle.trim()}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {creatingNotebook ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Create Notebook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: SOURCE EXCERPT CITATION INSPECTOR                           */}
      {/* ==================================================================== */}
      {activeCitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setActiveCitation(null)}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-[var(--accent)] mb-2 font-mono text-xs uppercase tracking-wider">
              <BookOpen className="w-4 h-4" />
              <span>Grounded Source Excerpt</span>
            </div>

            <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
              {activeCitation.document_title}
            </h3>

            <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] font-mono mb-4">
              {activeCitation.page_number && <span>Page {activeCitation.page_number}</span>}
              {activeCitation.section && <span>• Section: {activeCitation.section}</span>}
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text-primary)] leading-relaxed max-h-[40vh] overflow-y-auto whitespace-pre-wrap">
              {activeCitation.snippet}
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setActiveCitation(null)}
                className="px-4 py-2 rounded-lg bg-[var(--surface-hover)] text-xs text-[var(--text-primary)] hover:bg-[var(--border)]"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
