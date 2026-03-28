import { randomUUID } from 'crypto';

const DIFF_ORDER = ['easy', 'medium', 'hard'];

function buildExamPrompt(topic) {
  return `Generate 6 questions for the topic "${topic}" mixing difficulties (2 easy, 2 medium, 2 hard).
Return JSON array with fields: id, type ("mcq" or "short"), difficulty (easy|medium|hard), question, options (array for mcq, else []), answer, explanation.
Keep questions concise.`;
}

function buildEvalPrompt(questionObj, userAnswer) {
  return `Question: ${questionObj.question}
Difficulty: ${questionObj.difficulty}
Type: ${questionObj.type}
Options: ${Array.isArray(questionObj.options) ? questionObj.options.join(' | ') : ''}
Correct Answer: ${questionObj.answer}
User Answer: ${userAnswer}

Evaluate strictly. Respond JSON { score: 1 or 0, correctAnswer: string, explanation: string, feedback: string }`;
}

function normalizeQuestions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((q) => ({
      id: q.id || randomUUID(),
      type: q.type === 'short' ? 'short' : 'mcq',
      difficulty: DIFF_ORDER.includes(q.difficulty) ? q.difficulty : 'medium',
      question: q.question || '',
      options: Array.isArray(q.options) ? q.options.slice(0, 6) : [],
      answer: q.answer || '',
      explanation: q.explanation || '',
    }))
    .filter((q) => q.question && q.answer);
}

export default {
  buildExamPrompt,
  buildEvalPrompt,
  normalizeQuestions,
};
