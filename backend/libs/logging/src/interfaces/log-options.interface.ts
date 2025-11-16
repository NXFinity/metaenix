import { LogLevel } from '../enums/log-level.enum';
import { LogCategory } from '../enums/log-category.enum';

export interface LogOptions {
  level?: LogLevel;
  category?: LogCategory;
  userId?: string;
  username?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  metadata?: Record<string, any>;
  error?: Error;
  saveToDatabase?: boolean; // Whether to save audit logs to database
}

export interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: string;
  userId?: string;
  username?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  metadata?: Record<string, any>;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
    code?: string;
  };
}

