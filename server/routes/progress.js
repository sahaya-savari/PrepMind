import { Router } from 'express';

const router = Router();

router.get('/progress', (req, res) => {
  const data = [
    { id: 1, topic: 'algorithms', score: 85, created_at: new Date().toISOString() },
    { id: 2, topic: 'system design', score: 78, created_at: new Date().toISOString() }
  ];

  res.json({ progress: data });
});

export default router;
