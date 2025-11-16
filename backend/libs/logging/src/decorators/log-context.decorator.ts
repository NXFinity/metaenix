import { SetMetadata } from '@nestjs/common';

export const LOG_CONTEXT_KEY = 'log_context';

/**
 * Decorator to set logging context for a class or method
 * @param context - Context name for logging
 */
export const LogContext = (context: string) =>
  SetMetadata(LOG_CONTEXT_KEY, context);

