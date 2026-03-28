import { Router } from 'express';
import { supabase } from '../db.js';

const router = Router();

router.post('/ask', async (req, res) => {
  const { question } = req.body || {};
  if (!question) return res.status(400).json({ error: 'question is required' });

  const answer = `This is a helpful response about: ${question}`;

  await supabase.from('chats').insert({ question, answer });

  res.json({ answer });
});

export default router;
