const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

/**
 * Structured line logger. Emits JSON when LOG_FORMAT=json (good for hosted log
 * aggregators) and a compact human line otherwise.
 */
export function createLogger({ level = 'info', format = 'pretty' } = {}) {
  const threshold = LEVELS[level] ?? LEVELS.info;

  const emit = (name, message, meta) => {
    if (LEVELS[name] < threshold) return;
    const time = new Date().toISOString();

    if (format === 'json') {
      const line = JSON.stringify({ time, level: name, message, ...(meta ?? {}) });
      (name === 'error' ? console.error : console.log)(line);
      return;
    }

    const suffix = meta ? ` ${JSON.stringify(meta)}` : '';
    const line = `${time} ${name.toUpperCase().padEnd(5)} ${message}${suffix}`;
    (name === 'error' ? console.error : console.log)(line);
  };

  return {
    debug: (message, meta) => emit('debug', message, meta),
    info: (message, meta) => emit('info', message, meta),
    warn: (message, meta) => emit('warn', message, meta),
    error: (message, meta) => emit('error', message, meta),
  };
}
