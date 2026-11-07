import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

const number = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV ?? 'development';
  const isProduction = nodeEnv === 'production';

  return {
    nodeEnv,
    isProduction,
    port: number(env.PORT, 4000),
    host: env.HOST ?? '0.0.0.0',
    // Same-origin in production; the Vite dev server needs an explicit allowance.
    corsOrigin: env.CORS_ORIGIN
      ? env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
      : isProduction
        ? false
        : ['http://localhost:5173', 'http://127.0.0.1:5173'],
    trustProxy: env.TRUST_PROXY ?? (isProduction ? 1 : false),
    bodyLimit: env.BODY_LIMIT ?? '2mb',
    // When the client is hosted as its own service or site, this process is
    // API-only and must not also answer with a stale bundle.
    serveClient: env.SERVE_CLIENT !== 'false',
    dataFile: env.DATA_FILE ?? path.join(repoRoot, 'server', 'data', 'store.json'),
    rateLimit: {
      windowMs: number(env.RATE_LIMIT_WINDOW_MS, 60_000),
      max: number(env.RATE_LIMIT_MAX, 240),
    },
    log: {
      level: env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
      format: env.LOG_FORMAT ?? (isProduction ? 'json' : 'pretty'),
    },
  };
}
