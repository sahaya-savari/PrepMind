export const ENABLE_STREAMING = (import.meta.env.VITE_ENABLE_STREAMING ?? 'true') === 'true';
export const ENABLE_RAG = (import.meta.env.VITE_ENABLE_RAG ?? 'false') === 'true';
export const ENABLE_PRACTICE_MODE = (import.meta.env.VITE_ENABLE_PRACTICE_MODE ?? 'true') === 'true';
export const DEBUG_MODE = (import.meta.env.VITE_DEBUG_MODE ?? 'false') === 'true';

export const CONFIG = {
  ENABLE_STREAMING,
  ENABLE_RAG,
  ENABLE_PRACTICE_MODE,
  DEBUG_MODE,
};
