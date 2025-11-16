/**
 * Error Response Interface
 * Structure of error responses returned by HttpExceptionFilter
 */
export interface ErrorResponse {
  /**
   * HTTP status code
   */
  statusCode: number;

  /**
   * Error message(s)
   */
  message: string[];

  /**
   * Timestamp when error occurred
   */
  timestamp: string;

  /**
   * Request path where error occurred
   */
  path: string;

  /**
   * Error name (development only)
   */
  error?: string;

  /**
   * Stack trace (development only)
   */
  stack?: string;
}

