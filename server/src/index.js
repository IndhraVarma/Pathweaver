import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createLogger } from './lib/logger.js';
import { JsonStore } from './lib/store.js';

const config = loadConfig();
const logger = createLogger(config.log);

async function main() {
  const store = await new JsonStore({ file: config.dataFile }).init();
  const app = createApp({ store, logger, config });

  const server = app.listen(config.port, config.host, () => {
    logger.info('server listening', {
      url: `http://${config.host}:${config.port}`,
      env: config.nodeEnv,
    });
  });

  // Finish in-flight requests before exiting so a rolling deploy drops nothing.
  const shutdown = (signal) => {
    logger.info('shutting down', { signal });
    server.close((error) => {
      if (error) {
        logger.error('shutdown failed', { error: error.message });
        process.exit(1);
      }
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error('failed to start', { error: error.stack ?? String(error) });
  process.exit(1);
});
