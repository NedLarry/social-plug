import { getRequestListener } from '@hono/node-server';
import react from '@vitejs/plugin-react';
import { defineConfig, type Connect, type Plugin } from 'vite';
import { app } from './server/app.ts';

/** Serves the scores API (/api/...) from the Vite dev and preview servers. */
function scoresApi(): Plugin {
  const listener = getRequestListener(app.fetch);
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    if (req.url?.startsWith('/api/')) void listener(req, res);
    else next();
  };
  return {
    name: 'scores-api',
    configureServer: (server) => void server.middlewares.use(middleware),
    configurePreviewServer: (server) => void server.middlewares.use(middleware),
  };
}

export default defineConfig({
  plugins: [react(), scoresApi()],
});
