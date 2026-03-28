import { Router } from 'express';
import { supabase } from '../db.js';

const router = Router();

router.post('/exam/generate', (req, res) => {
  const { topic } = req.body || {};
  if (!topic) return res.status(400).json({ error: 'topic is required' });

  const questions = [
    { id: 1, question: `What is ${topic}?` },
    { id: 2, question: `Explain a key concept of ${topic}.` },
    { id: 3, question: `List practical applications of ${topic}.` }
  ];

  res.json({ questions });
});

router.post('/exam/evaluate', async (req, res) => {
  const { answers } = req.body || {};
  if (!Array.isArray(answers)) return res.status(400).json({ error: 'answers must be an array' });

  const score = Math.min(100, Math.max(0, Math.round((answers.length / 3) * 100)));
  const feedback = score > 70 ? 'Great job! Keep refining details.' : 'Review the material and try again.';

  await supabase.from('progress').insert({ topic: 'general', score });

  res.json({ score, feedback });
});

export default router;
