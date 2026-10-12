// Re-export api/rag.js for app/api root consistency
import handler from '../../api/rag.js';
export * from '../../api/rag.js';
export default handler;
