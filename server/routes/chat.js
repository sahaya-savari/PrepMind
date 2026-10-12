import { Router } from 'express';
import { supabase } from '../db.js';

const router = Router();

router.post('/ask', async (req, res) => {
  const { question } = req.body || {};
  if (!question) return res.status(400).json({ error: 'question is required' });

  const answer = `This is a helpful response about: ${question}`;

  if (supabase) {
    try {
      await supabase.from('chats').insert({ question, answer });
    } catch (err) {
      console.warn('[PrepMind Server] Failed to insert chats into Supabase:', err?.message || err);
    }
  }

  res.json({ answer });
});

export default router;
