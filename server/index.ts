// Production server: the built site (dist/) plus the scores API.
//   npm run build && npm start
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { app as api } from './app.ts';

const port = Number(process.env.PORT ?? 3000);
const site = new Hono();

site.route('/', api);
site.use('/*', serveStatic({ root: './dist' }));
// Client-side routes like /games/snake all load the app.
site.get('*', serveStatic({ path: './dist/index.html' }));

serve({ fetch: site.fetch, port }, () => console.log(`Games - Social on http://localhost:${port}`));
