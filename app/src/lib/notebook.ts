import { supabase, isSupabaseConfigured } from './supabase';
import { postJSON } from '../api';
import type { Citation, DocumentChunk } from './rag';

export interface Notebook {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
  documentCount?: number;
}

export interface NotebookMessage {
  id: string;
  notebook_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  created_at: string;
}

export type ArtifactType = 'summary' | 'notes' | 'flashcards' | 'quiz' | 'guide';

export interface FlashcardItem {
  id?: string;
  question: string;
  answer: string;
  topic?: string;
  source?: string;
}

export interface QuizQuestionItem {
  id?: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  source?: string;
}

export interface NotebookArtifact {
  id: string;
  notebook_id: string;
  user_id: string;
  type: ArtifactType;
  title: string;
  content: {
    text?: string;
    flashcards?: FlashcardItem[];
    quiz?: QuizQuestionItem[];
    citations?: Citation[];
  };
  created_at: string;
}

const LOCAL_NOTEBOOKS_KEY = 'prepmind_notebooks_v1';
const LOCAL_MESSAGES_KEY = 'prepmind_notebook_messages_v1';
const LOCAL_ARTIFACTS_KEY = 'prepmind_notebook_artifacts_v1';

function getLocalNotebooks(userId?: string): Notebook[] {
  try {
    const raw = localStorage.getItem(LOCAL_NOTEBOOKS_KEY);
    const all: Notebook[] = raw ? JSON.parse(raw) : [];
    if (userId) return all.filter((n) => n.user_id === userId);
    return all;
  } catch {
    return [];
  }
}

function saveLocalNotebooks(notebooks: Notebook[]): void {
  try {
    localStorage.setItem(LOCAL_NOTEBOOKS_KEY, JSON.stringify(notebooks));
  } catch {
    // quota safeguard
  }
}

function getLocalMessages(notebookId: string): NotebookMessage[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_MESSAGES_KEY}_${notebookId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalMessages(notebookId: string, messages: NotebookMessage[]): void {
  try {
    localStorage.setItem(`${LOCAL_MESSAGES_KEY}_${notebookId}`, JSON.stringify(messages.slice(-50)));
  } catch {
    // quota safeguard
  }
}

function getLocalArtifacts(notebookId: string): NotebookArtifact[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_ARTIFACTS_KEY}_${notebookId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalArtifacts(notebookId: string, artifacts: NotebookArtifact[]): void {
  try {
    localStorage.setItem(`${LOCAL_ARTIFACTS_KEY}_${notebookId}`, JSON.stringify(artifacts.slice(-30)));
  } catch {
    // quota safeguard
  }
}

// ----------------------------------------------------------------------------
// 1. NOTEBOOK CRUD
// ----------------------------------------------------------------------------

export async function listNotebooks(userId: string): Promise<Notebook[]> {
  if (!userId) return [];

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('notebooks')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return data as Notebook[];
      }
    } catch (err) {
      console.warn('[PrepMind] Remote listNotebooks fallback:', err);
    }
  }

  return getLocalNotebooks(userId);
}

export async function createNotebook(
  title: string,
  description: string,
  userId: string
): Promise<Notebook> {
  const cleanTitle = title.trim();
  if (!cleanTitle) throw new Error('Notebook title is required.');
  if (!userId) throw new Error('User authentication required.');

  const now = new Date().toISOString();
  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'nb_' + Date.now().toString(36);

  const newNotebook: Notebook = {
    id,
    user_id: userId,
    title: cleanTitle,
    description: description.trim() || undefined,
    created_at: now,
    updated_at: now,
  };

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('notebooks')
        .insert({
          id: newNotebook.id,
          user_id: newNotebook.user_id,
          title: newNotebook.title,
          description: newNotebook.description || null,
          created_at: now,
          updated_at: now,
        })
        .select('*')
        .single();

      if (!error && data) {
        const remote = data as Notebook;
        const all = getLocalNotebooks().filter((n) => n.id !== id);
        saveLocalNotebooks([remote, ...all]);
        return remote;
      }
    } catch (err) {
      console.warn('[PrepMind] Remote createNotebook fallback to local:', err);
    }
  }

  const all = getLocalNotebooks();
  saveLocalNotebooks([newNotebook, ...all]);
  return newNotebook;
}

export async function updateNotebook(
  id: string,
  title: string,
  description: string,
  userId: string
): Promise<Notebook> {
  const cleanTitle = title.trim();
  if (!cleanTitle) throw new Error('Notebook title is required.');
  const now = new Date().toISOString();

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('notebooks')
        .update({
          title: cleanTitle,
          description: description.trim() || null,
          updated_at: now,
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (!error && data) {
        const remote = data as Notebook;
        const updated = getLocalNotebooks().map((n) => (n.id === id ? remote : n));
        saveLocalNotebooks(updated);
        return remote;
      }
    } catch (err) {
      console.warn('[PrepMind] Remote updateNotebook fallback:', err);
    }
  }

  const updated = getLocalNotebooks().map((n) => {
    if (n.id === id && n.user_id === userId) {
      return { ...n, title: cleanTitle, description: description.trim() || undefined, updated_at: now };
    }
    return n;
  });
  saveLocalNotebooks(updated);
  const found = updated.find((n) => n.id === id);
  if (!found) throw new Error('Notebook not found.');
  return found;
}

export async function deleteNotebook(id: string, userId: string): Promise<boolean> {
  if (!id || !userId) return false;

  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase
        .from('notebooks')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
    } catch (err) {
      console.warn('[PrepMind] Remote deleteNotebook warning:', err);
    }
  }

  const remaining = getLocalNotebooks().filter((n) => n.id !== id);
  saveLocalNotebooks(remaining);
  localStorage.removeItem(`${LOCAL_MESSAGES_KEY}_${id}`);
  localStorage.removeItem(`${LOCAL_ARTIFACTS_KEY}_${id}`);
  return true;
}

export async function getNotebook(id: string, userId: string): Promise<Notebook | null> {
  if (!id || !userId) return null;

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('notebooks')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (!error && data) return data as Notebook;
    } catch {
      // fallback
    }
  }

  const local = getLocalNotebooks(userId);
  return local.find((n) => n.id === id) || null;
}

// ----------------------------------------------------------------------------
// 2. NOTEBOOK MESSAGES (Scoped conversations with cited evidence)
// ----------------------------------------------------------------------------

export async function fetchNotebookMessages(
  notebookId: string,
  userId: string
): Promise<NotebookMessage[]> {
  if (!notebookId || !userId) return [];

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('notebook_messages')
        .select('*')
        .eq('notebook_id', notebookId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data)) {
        return data as NotebookMessage[];
      }
    } catch (err) {
      console.warn('[PrepMind] Remote fetchNotebookMessages fallback:', err);
    }
  }

  return getLocalMessages(notebookId);
}

export async function saveNotebookMessage(
  msg: Omit<NotebookMessage, 'id' | 'created_at'>
): Promise<NotebookMessage> {
  const now = new Date().toISOString();
  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'msg_' + Date.now().toString(36);

  const fullMsg: NotebookMessage = {
    id,
    created_at: now,
    ...msg,
  };

  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('notebook_messages').insert({
        id: fullMsg.id,
        notebook_id: fullMsg.notebook_id,
        user_id: fullMsg.user_id,
        role: fullMsg.role,
        content: fullMsg.content,
        citations: fullMsg.citations || [],
        created_at: now,
      });
    } catch (err) {
      console.warn('[PrepMind] Remote saveNotebookMessage fallback:', err);
    }
  }

  const existing = getLocalMessages(msg.notebook_id);
  saveLocalMessages(msg.notebook_id, [...existing, fullMsg]);
  return fullMsg;
}

export async function clearNotebookMessages(notebookId: string, userId: string): Promise<boolean> {
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase
        .from('notebook_messages')
        .delete()
        .eq('notebook_id', notebookId)
        .eq('user_id', userId);
    } catch {
      // fallback
    }
  }
  localStorage.removeItem(`${LOCAL_MESSAGES_KEY}_${notebookId}`);
  return true;
}

// ----------------------------------------------------------------------------
// 3. NOTEBOOK ARTIFACTS (Summary, Notes, Flashcards, Quiz, Guide)
// ----------------------------------------------------------------------------

export async function fetchNotebookArtifacts(
  notebookId: string,
  userId: string
): Promise<NotebookArtifact[]> {
  if (!notebookId || !userId) return [];

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('notebook_artifacts')
        .select('*')
        .eq('notebook_id', notebookId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return data as NotebookArtifact[];
      }
    } catch (err) {
      console.warn('[PrepMind] Remote fetchNotebookArtifacts fallback:', err);
    }
  }

  return getLocalArtifacts(notebookId);
}

export async function saveNotebookArtifact(
  artifact: Omit<NotebookArtifact, 'id' | 'created_at'>
): Promise<NotebookArtifact> {
  const now = new Date().toISOString();
  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'art_' + Date.now().toString(36);

  const fullArtifact: NotebookArtifact = {
    id,
    created_at: now,
    ...artifact,
  };

  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('notebook_artifacts').insert({
        id: fullArtifact.id,
        notebook_id: fullArtifact.notebook_id,
        user_id: fullArtifact.user_id,
        type: fullArtifact.type,
        title: fullArtifact.title,
        content: fullArtifact.content,
        created_at: now,
      });
    } catch (err) {
      console.warn('[PrepMind] Remote saveNotebookArtifact fallback:', err);
    }
  }

  const existing = getLocalArtifacts(artifact.notebook_id);
  saveLocalArtifacts(artifact.notebook_id, [fullArtifact, ...existing]);
  return fullArtifact;
}

export async function deleteNotebookArtifact(
  artifactId: string,
  notebookId: string,
  userId: string
): Promise<boolean> {
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase
        .from('notebook_artifacts')
        .delete()
        .eq('id', artifactId)
        .eq('user_id', userId);
    } catch {
      // fallback
    }
  }

  const existing = getLocalArtifacts(notebookId).filter((a) => a.id !== artifactId);
  saveLocalArtifacts(notebookId, existing);
  return true;
}

// ----------------------------------------------------------------------------
// 4. GENERATE GROUNDED LEARNING ARTIFACTS
// ----------------------------------------------------------------------------

export async function generateGroundedLearningArtifact(
  toolType: ArtifactType,
  notebookTitle: string,
  passages: DocumentChunk[]
): Promise<{ title: string; content: any; citations: Citation[] }> {
  if (!passages.length) {
    throw new Error('No document passages available in this notebook to synthesize study materials.');
  }

  // 1. Get structured prompt & citations from /api/rag
  const ragToolRes = await postJSON<{
    tool: string;
    instructions: string;
    contextText: string;
    citations: Citation[];
    systemPrompt: string;
  }>('/api/rag', {
    action: 'notebook_tool',
    tool: toolType,
    notebookTitle,
    passages,
  });

  const toolPrompt = `${ragToolRes.instructions}\n\n[STUDY PASSAGES]:\n${ragToolRes.contextText}`;

  // 2. Dispatch to AI orchestrator /api/ai
  const aiRes = await postJSON<{ response: string }>('/api/ai', {
    action: 'chat',
    messages: [
      { role: 'system', content: ragToolRes.systemPrompt },
      { role: 'user', content: toolPrompt },
    ],
  });

  const rawText = aiRes?.response || '';
  if (!rawText.trim()) throw new Error('AI service returned an empty generation.');

  // Titles mapping
  const titles: Record<ArtifactType, string> = {
    summary: `Executive Summary: ${notebookTitle}`,
    notes: `Revision Notes: ${notebookTitle}`,
    flashcards: `Flashcards: ${notebookTitle}`,
    quiz: `Practice Quiz: ${notebookTitle}`,
    guide: `Comprehensive Study Guide: ${notebookTitle}`,
  };

  // Structured parse for flashcards and quiz
  if (toolType === 'flashcards') {
    let parsedCards: FlashcardItem[] = [];
    try {
      const clean = rawText.replace(/```json\s*|```/g, '').trim();
      const s = clean.indexOf('[');
      const e = clean.lastIndexOf(']');
      if (s !== -1 && e !== -1 && e > s) {
        parsedCards = JSON.parse(clean.slice(s, e + 1));
      }
    } catch {
      // fallback manual parse
    }

    if (!parsedCards.length) {
      // synthesize from text lines
      parsedCards = [
        { question: `Key Insight from ${notebookTitle}`, answer: rawText.slice(0, 300) },
      ];
    }

    return {
      title: titles[toolType],
      content: { flashcards: parsedCards, citations: ragToolRes.citations },
      citations: ragToolRes.citations,
    };
  }

  if (toolType === 'quiz') {
    let parsedQuiz: QuizQuestionItem[] = [];
    try {
      const clean = rawText.replace(/```json\s*|```/g, '').trim();
      const s = clean.indexOf('[');
      const e = clean.lastIndexOf(']');
      if (s !== -1 && e !== -1 && e > s) {
        parsedQuiz = JSON.parse(clean.slice(s, e + 1));
      }
    } catch {
      // fallback
    }

    if (!parsedQuiz.length) {
      parsedQuiz = [
        {
          question: `Which core principle was emphasized in ${notebookTitle}?`,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          answer: 'Option A',
          explanation: rawText.slice(0, 200),
        },
      ];
    }

    return {
      title: titles[toolType],
      content: { quiz: parsedQuiz, citations: ragToolRes.citations },
      citations: ragToolRes.citations,
    };
  }

  // Text markdown based (summary, notes, guide)
  return {
    title: titles[toolType],
    content: { text: rawText, citations: ragToolRes.citations },
    citations: ragToolRes.citations,
  };
}
