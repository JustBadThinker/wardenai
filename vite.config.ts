import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { defineConfig, type Plugin } from 'vite';
import { handleCommunityApi } from './server/datacatService.ts';

function communityProxyPlugin(): Plugin {
  return {
    name: 'warden-community-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/community')) {
          await handleCommunityApi(req, res, next);
        } else if (req.url && req.url.startsWith('/api/proxy-image-gen')) {
          await handleImageGenProxy(req, res);
        } else {
          next();
        }
      });
    }
  };
}

async function handleImageGenProxy(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.end();
    return;
  }

  try {
    const targetUrl = req.headers['x-target-url'] as string;
    if (!targetUrl) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: { message: 'Missing X-Target-Url header' } }));
      return;
    }

    const chunks: any[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const bodyStr = Buffer.concat(chunks).toString('utf-8');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    };
    if (req.headers['authorization']) {
      headers['Authorization'] = req.headers['authorization'];
    }

    console.log(`[ImageGenProxy] Forwarding to: ${targetUrl}`);
    const upstreamRes = await fetch(targetUrl, {
      method: req.method || 'POST',
      headers,
      body: bodyStr || undefined
    });

    const resText = await upstreamRes.text();
    console.log(`[ImageGenProxy] Upstream responded with status: ${upstreamRes.status}`);

    res.statusCode = upstreamRes.status;
    res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(resText);
  } catch (err: any) {
    console.error('[ImageGenProxy] Proxy failed:', err);
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(JSON.stringify({ error: { message: `Image proxy failed: ${err?.message || err}` } }));
  }
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), communityProxyPlugin()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('.', import.meta.url)),
      },
    },
    server: {
      hmr: true,
      watch: {},
    },
  };
});
