import express from 'express';

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In dev, Vite runs on :3000 and proxies /api → :3001 (this server).
// In production (Docker), this server serves everything on PORT (default 3000).
const PORT = parseInt(process.env.PORT || (process.env.NODE_ENV === 'production' ? '3000' : '3001'), 10);

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));



  // ─── Health check ─────────────────────────────────────────────────────────────
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', env: process.env.NODE_ENV || 'development' });
  });

  // ─── Frontend serving ─────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    // Dev: use Vite as middleware so HMR works when accessed directly on :3001
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve pre-built frontend from dist/
    // NOTE: server.mjs is compiled into dist/, so __dirname already IS dist/.
    // We use process.cwd()/dist as the canonical path to avoid ambiguity.
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/*splat', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[geoai-mapper] Server running on http://0.0.0.0:${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
