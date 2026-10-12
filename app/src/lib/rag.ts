import { supabase, isSupabaseConfigured } from './supabase';
import { postJSON } from '../api';
import type { McqQuestionItem } from '../api';

export interface StudyDocument {
  id: string;
  user_id: string;
  title: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
  error_message?: string | null;
  page_count?: number | null;
  char_count?: number | null;
  content_hash?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  document_name?: string;
  user_id: string;
  chunk_index: number;
  chunk_text: string;
  page_number?: number | null;
  section_title?: string | null;
  similarity?: number;
  embedding?: number[];
}

export interface Citation {
  document_title: string;
  page_number?: number | null;
  section?: string | null;
  chunk_index?: number;
  snippet: string;
}

const LOCAL_DOCS_KEY = 'prepmind_study_documents';
const LOCAL_CHUNKS_KEY = 'prepmind_study_chunks';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit
const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.md'];

function getLocalDocuments(userId?: string): StudyDocument[] {
  try {
    const raw = localStorage.getItem(LOCAL_DOCS_KEY);
    const all: StudyDocument[] = raw ? JSON.parse(raw) : [];
    if (userId) return all.filter((d) => d.user_id === userId);
    return all;
  } catch {
    return [];
  }
}

function saveLocalDocuments(docs: StudyDocument[]): void {
  try {
    localStorage.setItem(LOCAL_DOCS_KEY, JSON.stringify(docs));
  } catch {
    // Storage quota fallback
  }
}

function getLocalChunks(userId?: string): DocumentChunk[] {
  try {
    const raw = localStorage.getItem(LOCAL_CHUNKS_KEY);
    const all: DocumentChunk[] = raw ? JSON.parse(raw) : [];
    if (userId) return all.filter((c) => c.user_id === userId);
    return all;
  } catch {
    return [];
  }
}

function saveLocalChunks(chunks: DocumentChunk[]): void {
  try {
    localStorage.setItem(LOCAL_CHUNKS_KEY, JSON.stringify(chunks));
  } catch {
    // Storage quota fallback
  }
}

// ----------------------------------------------------------------------------
// 1. FETCH DOCUMENTS FOR USER
// ----------------------------------------------------------------------------
export async function fetchUserDocuments(userId: string): Promise<StudyDocument[]> {
  if (!userId) return [];

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return data as StudyDocument[];
      }
    } catch (err) {
      console.warn('[PrepMind] Remote fetchUserDocuments fallback to local storage:', err);
    }
  }

  return getLocalDocuments(userId);
}

// ----------------------------------------------------------------------------
// 2. UPLOAD & INGEST STUDY DOCUMENT
// ----------------------------------------------------------------------------
export async function uploadStudyDocument(
  file: File,
  userId: string,
  onProgress?: (percent: number) => void
): Promise<StudyDocument> {
  if (!file) throw new Error('No file provided for upload.');
  if (!userId) throw new Error('User authentication required to upload study materials.');

  // Validate file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File exceeds maximum size of 10 MB (provided: ${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
  }
  if (file.size === 0) {
    throw new Error('File is empty.');
  }

  // Validate extension
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`Unsupported file type "${ext}". Supported formats: PDF, TXT, Markdown.`);
  }

  const docId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'doc_' + Date.now().toString(36);

  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${userId}/${docId}-${cleanName}`;
  const now = new Date().toISOString();

  let initialDoc: StudyDocument = {
    id: docId,
    user_id: userId,
    title: file.name,
    storage_path: storagePath,
    mime_type: file.type || (ext === '.pdf' ? 'application/pdf' : 'text/plain'),
    file_size: file.size,
    status: 'uploaded',
    created_at: now,
    updated_at: now,
  };

  onProgress?.(20);

  // 1. Try Supabase Storage Upload if configured
  let uploadedToCloudStorage = false;
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error: storageErr } = await supabase.storage
        .from('study_materials')
        .upload(storagePath, file, {
          cacheControl: '3600',
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });

      if (!storageErr) {
        uploadedToCloudStorage = true;
      } else {
        console.warn('[PrepMind] Storage upload warning:', storageErr.message);
      }
    } catch (err) {
      console.warn('[PrepMind] Cloud storage upload exception:', err);
    }
  }

  onProgress?.(40);

  // 2. Persist initial document row in Supabase or local state
  if (isSupabaseConfigured() && supabase && uploadedToCloudStorage) {
    try {
      await supabase.from('documents').insert({
        id: initialDoc.id,
        user_id: initialDoc.user_id,
        title: initialDoc.title,
        storage_path: initialDoc.storage_path,
        mime_type: initialDoc.mime_type,
        file_size: initialDoc.file_size,
        status: 'uploaded',
        created_at: now,
        updated_at: now,
      });
    } catch (err) {
      console.warn('[PrepMind] Documents table insert warning:', err);
    }
  }

  // Update local list
  const existingLocal = getLocalDocuments();
  saveLocalDocuments([initialDoc, ...existingLocal]);

  onProgress?.(60);

  // 3. Process document via /api/rag endpoint
  try {
    let fileBase64: string | undefined;
    let fileText: string | undefined;

    if (ext === '.pdf') {
      const arrayBuf = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      fileBase64 = btoa(binary);
    } else {
      fileText = await file.text();
    }

    onProgress?.(75);

    const processRes = await postJSON<{
      success: boolean;
      documentId: string;
      chunkCount: number;
      pageCount: number;
      characterCount: number;
      contentHash: string;
      chunks: Array<{
        id: string;
        chunkIndex: number;
        chunkText: string;
        pageNumber: number;
        sectionTitle: string;
        embedding: number[];
      }>;
    }>('/api/rag', {
      action: 'process_document',
      documentId: docId,
      name: file.name,
      mimeType: initialDoc.mime_type,
      text: fileText,
      fileBase64,
      userId,
    });

    onProgress?.(90);

    if (processRes && processRes.success) {
      const readyDoc: StudyDocument = {
        ...initialDoc,
        status: 'ready',
        page_count: processRes.pageCount || 1,
        char_count: processRes.characterCount || 0,
        content_hash: processRes.contentHash,
        updated_at: new Date().toISOString(),
      };

      // Map chunks
      const mappedChunks: DocumentChunk[] = (processRes.chunks || []).map((c) => ({
        id: c.id || `${docId}_${c.chunkIndex}`,
        document_id: docId,
        document_name: file.name,
        user_id: userId,
        chunk_index: c.chunkIndex,
        chunk_text: c.chunkText,
        page_number: c.pageNumber,
        section_title: c.sectionTitle,
        embedding: c.embedding,
      }));

      // Persist to Supabase if available
      if (isSupabaseConfigured() && supabase) {
        try {
          await supabase
            .from('documents')
            .update({
              status: 'ready',
              page_count: readyDoc.page_count,
              char_count: readyDoc.char_count,
              content_hash: readyDoc.content_hash,
              updated_at: readyDoc.updated_at,
            })
            .eq('id', docId);

          if (mappedChunks.length > 0) {
            // Insert chunks into pgvector table
            const chunkPayloads = mappedChunks.map((c) => ({
              id: c.id,
              document_id: c.document_id,
              user_id: c.user_id,
              chunk_index: c.chunk_index,
              chunk_text: c.chunk_text,
              page_number: c.page_number,
              section_title: c.section_title,
              embedding: c.embedding,
            }));

            await supabase.from('chunks').upsert(chunkPayloads);
          }
        } catch (err) {
          console.warn('[PrepMind] Remote chunks persistence fallback:', err);
        }
      }

      // Persist in local storage
      const updatedLocal = getLocalDocuments().map((d) => (d.id === docId ? readyDoc : d));
      saveLocalDocuments(updatedLocal);

      const allLocalChunks = getLocalChunks().filter((c) => c.document_id !== docId);
      saveLocalChunks([...mappedChunks, ...allLocalChunks]);

      onProgress?.(100);
      return readyDoc;
    } else {
      throw new Error('Processing returned incomplete status.');
    }
  } catch (err: any) {
    const errorMsg = err?.message || 'Text extraction or vector embedding failed.';
    const failedDoc: StudyDocument = {
      ...initialDoc,
      status: 'failed',
      error_message: errorMsg,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabase) {
      await supabase
        .from('documents')
        .update({ status: 'failed', error_message: errorMsg, updated_at: failedDoc.updated_at })
        .eq('id', docId)
        .catch(() => {});
    }

    const updatedLocal = getLocalDocuments().map((d) => (d.id === docId ? failedDoc : d));
    saveLocalDocuments(updatedLocal);
    throw new Error(errorMsg);
  }
}

// ----------------------------------------------------------------------------
// 3. DELETE DOCUMENT & ASSOCIATED STORAGE / VECTORS
// ----------------------------------------------------------------------------
export async function deleteStudyDocument(
  docId: string,
  storagePath: string,
  userId: string
): Promise<boolean> {
  if (!docId) return false;

  let cloudSuccess = true;

  if (isSupabaseConfigured() && supabase) {
    try {
      // 1. Delete vector chunks
      await supabase.from('chunks').delete().eq('document_id', docId);

      // 2. Delete document metadata row
      await supabase.from('documents').delete().eq('id', docId);

      // 3. Delete file object from private storage bucket
      if (storagePath) {
        await supabase.storage.from('study_materials').remove([storagePath]);
      }
    } catch (err) {
      console.warn('[PrepMind] Remote document delete error:', err);
      cloudSuccess = false;
    }
  }

  // Clean local state
  const localDocs = getLocalDocuments().filter((d) => d.id !== docId);
  saveLocalDocuments(localDocs);

  const localChunks = getLocalChunks().filter((c) => c.document_id !== docId);
  saveLocalChunks(localChunks);

  return cloudSuccess;
}

// ----------------------------------------------------------------------------
// 4. RETRY / REPROCESS DOCUMENT
// ----------------------------------------------------------------------------
export async function reprocessStudyDocument(
  doc: StudyDocument
): Promise<boolean> {
  if (!doc || !doc.id) return false;

  const chunks = getLocalChunks(doc.user_id).filter((c) => c.document_id === doc.id);
  if (!chunks.length) {
    // If no local chunks or cached text, cannot re-extract without the raw file
    return false;
  }

  try {
    const rawText = chunks.map((c) => c.chunk_text).join('\n\n');
    const processRes = await postJSON<{
      success: boolean;
      chunks: Array<{
        id: string;
        chunkIndex: number;
        chunkText: string;
        pageNumber: number;
        embedding: number[];
      }>;
    }>('/api/rag', {
      action: 'process_document',
      documentId: doc.id,
      name: doc.title,
      mimeType: doc.mime_type,
      text: rawText,
      userId: doc.user_id,
    });

    if (processRes && processRes.success) {
      const readyDoc: StudyDocument = {
        ...doc,
        status: 'ready',
        error_message: null,
        updated_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured() && supabase) {
        await supabase
          .from('documents')
          .update({ status: 'ready', error_message: null, updated_at: readyDoc.updated_at })
          .eq('id', doc.id);
      }

      const updated = getLocalDocuments().map((d) => (d.id === doc.id ? readyDoc : d));
      saveLocalDocuments(updated);
      return true;
    }
  } catch (err) {
    console.warn('[PrepMind] Reprocess error:', err);
  }

  return false;
}

// ----------------------------------------------------------------------------
// 5. SIGNED DOWNLOAD URL GENERATION
// ----------------------------------------------------------------------------
export async function getStudyDocumentDownloadUrl(storagePath: string): Promise<string | null> {
  if (!storagePath) return null;

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.storage
        .from('study_materials')
        .createSignedUrl(storagePath, 3600); // 1 hour expiration

      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
    } catch (err) {
      console.warn('[PrepMind] Failed to generate signed URL:', err);
    }
  }

  return null;
}

// ----------------------------------------------------------------------------
// 6. RAG RETRIEVAL ENGINE (PASSAGES & CITATIONS)
// ----------------------------------------------------------------------------
export async function retrieveGroundedPassages(
  query: string,
  userId: string,
  selectedDocIds?: string[]
): Promise<{ passages: DocumentChunk[]; citations: Citation[] }> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return { passages: [], citations: [] };

  // 1. Gather candidate chunks for this user
  let candidateChunks: DocumentChunk[] = [];

  if (isSupabaseConfigured() && supabase) {
    try {
      let q = supabase
        .from('chunks')
        .select('id, document_id, chunk_index, chunk_text, page_number, section_title, embedding')
        .eq('user_id', userId);

      if (selectedDocIds && selectedDocIds.length > 0) {
        q = q.in('document_id', selectedDocIds);
      }

      const { data, error } = await q.limit(50);
      if (!error && Array.isArray(data) && data.length > 0) {
        // Attach document title
        const userDocs = await fetchUserDocuments(userId);
        const titleMap = new Map(userDocs.map((d) => [d.id, d.title]));

        candidateChunks = data.map((d: any) => ({
          ...d,
          document_name: titleMap.get(d.document_id) || 'Study Document',
        }));
      }
    } catch (err) {
      console.warn('[PrepMind] Candidate chunks query fallback:', err);
    }
  }

  if (!candidateChunks.length) {
    let local = getLocalChunks(userId);
    if (selectedDocIds && selectedDocIds.length > 0) {
      local = local.filter((c) => selectedDocIds.includes(c.document_id));
    }
    candidateChunks = local;
  }

  if (!candidateChunks.length) {
    return { passages: [], citations: [] };
  }

  // 2. Invoke /api/rag retrieve endpoint for 768-dim semantic similarity ranking
  try {
    const retrieveRes = await postJSON<{
      results: Array<{
        id: string;
        documentId: string;
        documentName: string;
        chunkText: string;
        pageNumber: number;
        similarity: number;
      }>;
    }>('/api/rag', {
      action: 'retrieve',
      query: cleanQuery,
      chunks: candidateChunks,
      threshold: 0.15,
      limit: 4,
    });

    const ranked = retrieveRes?.results || [];
    const passages: DocumentChunk[] = ranked.map((r, idx) => ({
      id: r.id || `rank_${idx}`,
      document_id: r.documentId,
      document_name: r.documentName,
      user_id: userId,
      chunk_index: idx,
      chunk_text: r.chunkText,
      page_number: r.pageNumber,
      similarity: r.similarity,
    }));

    const citations: Citation[] = passages.map((p) => ({
      document_title: p.document_name || 'Study Document',
      page_number: p.page_number || 1,
      section: p.section_title || undefined,
      chunk_index: p.chunk_index,
      snippet: p.chunk_text.slice(0, 160).trim() + (p.chunk_text.length > 160 ? '...' : ''),
    }));

    return { passages, citations };
  } catch (err) {
    console.warn('[PrepMind] RAG retrieval error, fallback to keyword matching:', err);
    // Simple fallback keyword match
    const keywords = cleanQuery.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const matches = candidateChunks
      .map((c) => {
        const textLower = c.chunk_text.toLowerCase();
        const score = keywords.reduce((acc, kw) => (textLower.includes(kw) ? acc + 1 : acc), 0);
        return { chunk: c, score };
      })
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((m) => m.chunk);

    const citations: Citation[] = matches.map((m) => ({
      document_title: m.document_name || 'Study Document',
      page_number: m.page_number || 1,
      snippet: m.chunk_text.slice(0, 160).trim(),
    }));

    return { passages: matches, citations };
  }
}
