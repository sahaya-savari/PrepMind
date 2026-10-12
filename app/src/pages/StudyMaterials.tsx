import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  fetchUserDocuments,
  uploadStudyDocument,
  deleteStudyDocument,
  reprocessStudyDocument,
  getStudyDocumentDownloadUrl,
  StudyDocument,
} from '../lib/rag';
import {
  BookOpen,
  Upload,
  FileText,
  Trash2,
  RotateCw,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  MessageSquare,
  FileCode,
  Shield,
  Layers,
  HelpCircle,
} from 'lucide-react';

function StudyMaterials() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadDocuments = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const docs = await fetchUserDocuments(user.id);
      setDocuments(docs);
    } catch (err: any) {
      console.warn('[PrepMind] Error loading study documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [user?.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setError(null);
    setSuccess(null);
    setUploading(true);
    setUploadProgress(10);

    try {
      const doc = await uploadStudyDocument(file, user.id, (percent) => {
        setUploadProgress(percent);
      });

      setSuccess(`"${doc.title}" processed into ${doc.char_count || 'active'} characters and indexed into vector memory.`);
      await loadDocuments();
    } catch (err: any) {
      setError(err?.message || 'Failed to upload and index document.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (doc: StudyDocument) => {
    if (!user) return;
    const confirmDelete = window.confirm(`Remove "${doc.title}" and erase its vector chunks from memory?`);
    if (!confirmDelete) return;

    setActiveActionId(doc.id);
    setError(null);
    try {
      await deleteStudyDocument(doc.id, doc.storage_path, user.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      setSuccess(`Removed "${doc.title}" and cleared associated vector indices.`);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete study material.');
    } finally {
      setActiveActionId(null);
    }
  };

  const handleReprocess = async (doc: StudyDocument) => {
    setActiveActionId(doc.id);
    setError(null);
    try {
      const ok = await reprocessStudyDocument(doc);
      if (ok) {
        setSuccess(`Re-indexed "${doc.title}" successfully.`);
        await loadDocuments();
      } else {
        setError(`Unable to reprocess "${doc.title}". Please upload the original file again.`);
      }
    } catch (err: any) {
      setError(err?.message || 'Reprocessing failed.');
    } finally {
      setActiveActionId(null);
    }
  };

  const handleDownload = async (doc: StudyDocument) => {
    try {
      const url = await getStudyDocumentDownloadUrl(doc.storage_path);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        setError('Direct download is only available when Supabase Cloud Storage is connected.');
      }
    } catch (err: any) {
      setError(err?.message || 'Download error.');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const readyDocuments = documents.filter((d) => d.status === 'ready');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Header Banner */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--accent)] shadow-sm">
              <BookOpen className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Knowledge Library &amp; Study Materials
            </h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-2xl">
            Upload your syllabus notes, lecture transcripts, and PDF textbooks. PrepMind extracts semantics, embeds them with Gemini vectors (768-dim), and grounds your Socratic AI Tutor with citations.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {readyDocuments.length > 0 && (
            <button
              type="button"
              onClick={() => navigate('/chat')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Query in Chat</span>
            </button>
          )}

          <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:opacity-90 transition-opacity cursor-pointer shadow-sm">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Material</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      </header>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-lg border border-[var(--error)]/40 bg-[var(--surface-elevated)] text-xs text-[var(--error)] flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-lg border border-[var(--positive)]/40 bg-[var(--surface-elevated)] text-xs text-[var(--positive)] flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{success}</span>
        </div>
      )}

      {/* Uploading Progress Bar */}
      {uploading && (
        <div className="p-4 rounded-xl border border-[var(--accent)]/30 bg-[var(--surface-elevated)] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="flex items-center gap-2 text-[var(--text-primary)]">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping" />
              <span>Extracting semantics &amp; generating 768-dim embeddings...</span>
            </span>
            <span className="text-[var(--accent)] font-bold">{uploadProgress}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[var(--surface)] overflow-hidden border border-[var(--border)]">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* 2. Upload Drop Zone Banner */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="p-6 rounded-xl border-2 border-dashed border-[var(--border-strong)] hover:border-[var(--accent)] bg-[var(--surface)]/50 hover:bg-[var(--surface)] transition-all cursor-pointer text-center space-y-3 group"
      >
        <div className="w-10 h-10 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:border-[var(--accent)] mx-auto transition-colors">
          <Upload className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
            Click to upload or drag &amp; drop study files
          </p>
          <p className="text-[11px] font-mono text-[var(--text-muted)]">
            Supported formats: PDF, TXT, Markdown (Max 10 MB per document)
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 pt-1 text-[10px] font-mono text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1">
            <Shield className="w-3 h-3 text-[var(--positive)]" />
            <span>Private User Bucket</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Layers className="w-3 h-3 text-[var(--accent)]" />
            <span>Boundary-Aware Chunks</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[var(--warning)]" />
            <span>pgvector Cosine Search</span>
          </span>
        </div>
      </div>

      {/* 3. Document Library List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <span>Indexed Documents</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--text-secondary)]">
              {documents.length}
            </span>
          </h2>
          {readyDocuments.length > 0 && (
            <span className="text-[11px] font-mono text-[var(--positive)] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--positive)] animate-pulse" />
              <span>{readyDocuments.length} ready for Socratic RAG</span>
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[var(--text-muted)] font-mono border border-[var(--border)] rounded-xl bg-[var(--surface)]">
            <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Querying document registry...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center space-y-3 border border-[var(--border)] rounded-xl bg-[var(--surface)]">
            <div className="w-12 h-12 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] mx-auto">
              <FileCode className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">No study materials uploaded yet</h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                Upload your course outlines, reference papers, or notes to unlock grounded AI responses with exact citations.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {documents.map((doc) => {
              const isPdf = doc.mime_type.includes('pdf') || doc.title.endsWith('.pdf');
              const isProcessing = doc.status === 'processing' || doc.status === 'uploaded';
              const isReady = doc.status === 'ready';
              const isFailed = doc.status === 'failed';
              const isBusy = activeActionId === doc.id;

              return (
                <div
                  key={doc.id}
                  className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shrink-0 mt-0.5">
                      {isPdf ? <FileText className="w-4 h-4" /> : <FileCode className="w-4 h-4" />}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] truncate max-w-xs sm:max-w-md">
                          {doc.title}
                        </span>
                        {/* Status Badge */}
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                            isReady
                              ? 'border-[var(--positive)]/30 bg-[var(--positive)]/10 text-[var(--positive)]'
                              : isProcessing
                              ? 'border-[var(--warning)]/30 bg-[var(--warning)]/10 text-[var(--warning)] animate-pulse'
                              : 'border-[var(--error)]/30 bg-[var(--error)]/10 text-[var(--error)]'
                          }`}
                        >
                          {isReady && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {isProcessing && <Clock className="w-2.5 h-2.5" />}
                          {isFailed && <AlertCircle className="w-2.5 h-2.5" />}
                          <span className="capitalize">{doc.status}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--text-muted)] flex-wrap">
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>•</span>
                        <span>{doc.page_count ? `${doc.page_count} page${doc.page_count > 1 ? 's' : ''}` : 'Single document'}</span>
                        {doc.char_count ? (
                          <>
                            <span>•</span>
                            <span>{doc.char_count.toLocaleString()} chars</span>
                          </>
                        ) : null}
                        <span>•</span>
                        <span>
                          {doc.created_at
                            ? new Date(doc.created_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'Recent'}
                        </span>
                      </div>

                      {doc.error_message && (
                        <p className="text-[11px] text-[var(--error)] mt-1 font-mono">
                          Error: {doc.error_message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Document Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    {isReady && (
                      <button
                        type="button"
                        onClick={() => navigate('/chat')}
                        title="Open AI Chat grounded on this document"
                        className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] hover:border-[var(--accent)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors cursor-pointer text-xs flex items-center justify-center gap-1.5 min-h-[36px]"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Ask AI</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDownload(doc)}
                      title="Download source material"
                      className="p-2 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] hover:border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {isFailed && (
                      <button
                        type="button"
                        onClick={() => handleReprocess(doc)}
                        disabled={isBusy}
                        title="Retry processing document"
                        className="p-2 rounded-lg border border-[var(--warning)]/40 bg-[var(--surface-elevated)] hover:border-[var(--warning)] text-[var(--warning)] transition-colors cursor-pointer disabled:opacity-50 min-w-[36px] min-h-[36px] flex items-center justify-center"
                      >
                        <RotateCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(doc)}
                      disabled={isBusy}
                      title="Delete study material and clear vector records"
                      className="p-2 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] hover:border-[var(--error)]/40 text-[var(--text-secondary)] hover:text-[var(--error)] transition-colors cursor-pointer disabled:opacity-50 min-w-[36px] min-h-[36px] flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. RAG Architecture Educational Callout */}
      <div className="p-4 sm:p-5 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-xs text-[var(--text-secondary)] space-y-2">
        <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold">
          <HelpCircle className="w-4 h-4 text-[var(--accent)]" />
          <span>How Retrieval-Augmented Generation (RAG) Works in PrepMind</span>
        </div>
        <p className="leading-relaxed">
          When you upload materials, PrepMind strips proprietary binary metadata, normalizes whitespace, chunks text on sentence boundaries (~800 characters with 120 character overlap), and computes embeddings via Gemini <code className="px-1 py-0.5 rounded bg-[var(--surface)] text-[var(--accent)] font-mono">text-embedding-004</code> (768 dimensions). When you query the AI Tutor, your question is embedded and matched via pgvector cosine similarity (<code className="px-1 py-0.5 rounded bg-[var(--surface)] text-[var(--positive)] font-mono">1 - (embedding &lt;=&gt; query)</code>) filtered strictly to your authenticated user ID.
        </p>
      </div>
    </div>
  );
}

export default StudyMaterials;
