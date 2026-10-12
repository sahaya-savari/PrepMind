import { Router } from 'express';
import { supabase } from '../db.js';

const router = Router();

router.post('/notes', async (req, res) => {
  const { topic } = req.body || {};
  if (!topic) return res.status(400).json({ error: 'topic is required' });

  const notes = `Key points for ${topic}: stay focused, review summaries, practice examples.`;

  if (supabase) {
    try {
      await supabase.from('notes').insert({ topic, content: notes });
    } catch (err) {
      console.warn('[PrepMind Server] Failed to insert notes into Supabase:', err?.message || err);
    }
  }

  res.json({ notes });
});

export default router;
