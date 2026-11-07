/**
 * Warden AI — Community Proxy Server (Port 3001)
 * Standalone proxy service for Datacat & JanitorAI character browsing.
 * (Note: The Vite dev server on port 3000 also proxies these requests automatically).
 *
 * Run with: npm run proxy (or npx tsx server.ts)
 * Listens on: http://localhost:3001
 */

import express, { type Request, type Response } from 'express';
import { handleCommunityApi, datacatService, COMMUNITY_CATEGORIES } from './server/datacatService';

const app = express();
const PORT = 3001;

// Allow CORS
app.use((_req: Request, res: Response, next: () => void) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  next();
});

app.options('*', (_req: Request, res: Response) => {
  res.sendStatus(204);
});

// Root status page
app.get('/', (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Warden AI — Community Catalog Server</title>
  <style>
    body {
      background: #0c0e14;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
      text-align: center;
    }
    .card {
      background: #12151e;
      border: 1px solid #1f2433;
      border-radius: 16px;
      padding: 32px 40px;
      max-width: 480px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    h1 {
      color: #c084fc;
      font-size: 24px;
      margin-top: 0;
    }
    p {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.6;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      background: rgba(34, 197, 94, 0.15);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .btn {
      display: inline-block;
      margin-top: 16px;
      background: #9333ea;
      color: white;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      padding: 12px 24px;
      border-radius: 10px;
      transition: background 0.2s;
    }
    .btn:hover {
      background: #a855f7;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">● Catalog Online (Port 3001)</div>
    <h1>Warden AI Community Gateway</h1>
    <p>Provides native browsing of Datacat and JanitorAI-compatible characters directly into Warden AI.</p>
    <a class="btn" href="http://localhost:3000">👉 Open Warden AI (http://localhost:3000)</a>
  </div>
</body>
</html>`);
});

// Connect the community API middleware
app.use(async (req, res, next) => {
  if (req.url.startsWith('/api/community')) {
    await handleCommunityApi(req, res, next);
  } else {
    next();
  }
});

app.listen(PORT, () => {
  console.log(`\n✅ Warden AI Community Proxy running on http://localhost:${PORT}`);
  console.log(`   Connected to Datacat & JanitorAI Catalog\n`);
});
