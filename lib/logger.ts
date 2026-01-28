import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

// Configure pino logger
// Note: pino-pretty transport disabled due to worker thread issues in Next.js dev mode
const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),

  // Base properties to include in all logs
  base: {
    env: process.env.NODE_ENV,
  },

  // Redact sensitive fields
  redact: {
    paths: [
      'password',
      'passwordHash',
      'token',
      'authorization',
      'cookie',
      'document_data',
      'encryptedDocument',
    ],
    censor: '[REDACTED]',
  },

  // Browser-safe config for Next.js (avoids worker threads)
  browser: {
    asObject: true,
  },
});

// Create child loggers for different modules
export const apiLogger = logger.child({ module: 'api' });
export const authLogger = logger.child({ module: 'auth' });
export const dbLogger = logger.child({ module: 'database' });
export const bookingLogger = logger.child({ module: 'booking' });

// Type for log context
export interface LogContext {
  userId?: string;
  requestId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  duration?: number;
  error?: Error | string;
  [key: string]: unknown;
}

// Utility functions for structured logging
export function logRequest(
  method: string,
  path: string,
  context: Omit<LogContext, 'method' | 'path'> = {}
) {
  apiLogger.info({ method, path, ...context }, `${method} ${path}`);
}

export function logResponse(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  context: Omit<LogContext, 'method' | 'path' | 'statusCode' | 'duration'> = {}
) {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  apiLogger[level](
    { method, path, statusCode, duration, ...context },
    `${method} ${path} ${statusCode} ${duration}ms`
  );
}

export function logError(
  error: Error | string,
  context: Omit<LogContext, 'error'> = {}
) {
  const errorObj = error instanceof Error ? {
    message: error.message,
    stack: error.stack,
    name: error.name,
  } : { message: error };

  logger.error({ error: errorObj, ...context }, errorObj.message);
}

export function logAuth(
  action: 'login' | 'logout' | 'register' | 'verify' | 'token_refresh',
  success: boolean,
  context: LogContext = {}
) {
  const level = success ? 'info' : 'warn';
  authLogger[level](
    { action, success, ...context },
    `Auth ${action}: ${success ? 'success' : 'failed'}`
  );
}

export function logBooking(
  action: 'create' | 'update' | 'cancel' | 'complete' | 'pay',
  bookingId: string,
  context: Omit<LogContext, 'bookingId'> = {}
) {
  bookingLogger.info(
    { action, bookingId, ...context },
    `Booking ${action}: ${bookingId}`
  );
}

export function logDbQuery(
  operation: string,
  model: string,
  duration: number,
  context: Omit<LogContext, 'operation' | 'model' | 'duration'> = {}
) {
  dbLogger.debug(
    { operation, model, duration, ...context },
    `DB ${operation} on ${model} (${duration}ms)`
  );
}

export default logger;
