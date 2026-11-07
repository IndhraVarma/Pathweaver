import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

import express from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';

import { createApiRouter } from './routes/api.js';
import { errorHandler, notFound } from './lib/errors.js';
import { rateLimit } from './lib/rateLimit.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

/**
 * Builds the Express application. Kept separate from `index.js` so tests can
 * mount it without binding a port.
 */
export function createApp({ store, logger, config }) {
  const app = express();

  // Behind a hosting proxy (Render, Fly, Heroku) so req.ip is the real client.
  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // The client is a static bundle served from this same origin.
      contentSecurityPolicy: config.isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
              imgSrc: ["'self'", 'data:'],
              connectSrc: ["'self'"],
              objectSrc: ["'none'"],
              frameAncestors: ["'self'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(compression());
  app.use(cors({ origin: config.corsOrigin, maxAge: 600 }));
  app.use(express.json({ limit: config.bodyLimit }));

  app.use(
    '/api',
    rateLimit({ windowMs: config.rateLimit.windowMs, max: config.rateLimit.max }),
    createApiRouter({ store, logger }),
  );

  app.use('/api', (req, res, next) => next(notFound(`No API route for ${req.method} ${req.path}`)));

  // In production the built client is served from this same service.
  const clientDir = path.join(repoRoot, 'client', 'dist');
  if (fs.existsSync(path.join(clientDir, 'index.html'))) {
    app.use(
      express.static(clientDir, {
        index: false,
        maxAge: '1y',
        setHeaders(res, filePath) {
          // Hashed assets may cache forever; the entry document may not.
          if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
        },
      }),
    );
    // SPA fallback. The entry document must never be cached, or a deploy's
    // new asset hashes stay invisible behind a stale index.html.
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(clientDir, 'index.html'));
    });
  } else {
    app.get('/', (req, res) => {
      res.status(200).json({
        service: 'pathfinding-visualizer-api',
        note: 'Client bundle not built. Run `npm run build`, or use the Vite dev server on port 5173.',
        api: '/api/health',
      });
    });
  }

  app.use(errorHandler(logger));

  return app;
}
