export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    if (details) this.details = details;
  }
}

export const badRequest = (message, details) => new HttpError(400, message, details);
export const notFound = (message = 'Resource not found') => new HttpError(404, message);
export const tooLarge = (message) => new HttpError(413, message);
export const tooMany = (message = 'Too many requests') => new HttpError(429, message);

/** Wraps an async route handler so rejections reach the error middleware. */
export const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

/** Terminal error middleware: one JSON shape for every failure. */
export function errorHandler(logger) {
  // eslint-disable-next-line no-unused-vars -- Express identifies this by arity.
  return (error, req, res, next) => {
    const status = Number.isInteger(error?.status) ? error.status : 500;

    if (status >= 500) {
      logger.error('request failed', { path: req.originalUrl, error: error?.stack ?? error });
    }

    res.status(status).json({
      error: {
        status,
        message: status >= 500 ? 'Internal server error' : error?.message ?? 'Request failed',
        ...(error?.details ? { details: error.details } : {}),
      },
    });
  };
}
