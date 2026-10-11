import http from 'http';
import handler from '../api/ai.js';

const PORT = 5000;

const server = http.createServer(async (req, res) => {
  // Add Express-like helpers for handler compatibility
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
    return res;
  };

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });

  req.on('end', async () => {
    try {
      req.body = body ? JSON.parse(body) : {};
    } catch {
      req.body = {};
    }

    try {
      await handler(req, res);
    } catch (err) {
      console.error('[local-api-err]', err);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err?.message || 'Server error' }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`[Local API Server] Running on http://localhost:${PORT}`);
});
