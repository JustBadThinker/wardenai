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
        } else {
          next();
        }
      });
    }
  };
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
