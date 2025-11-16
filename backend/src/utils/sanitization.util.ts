/**
 * Input sanitization utility
 * Removes HTML tags, escapes special characters, and prevents XSS attacks
 */

/**
 * Sanitize a string by removing HTML tags and escaping special characters
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Escape HTML entities
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  // Remove script tags and event handlers (case insensitive)
  sanitized = sanitized.replace(
    /javascript:|on\w+\s*=|script:|eval\(|expression\(/gi,
    '',
  );

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Sanitize a string but allow basic formatting (for bio fields)
 * Removes dangerous HTML but preserves line breaks
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove dangerous HTML tags but preserve line breaks
  let sanitized = input.replace(/<script[^>]*>.*?<\/script>/gi, '');
  sanitized = sanitized.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<object[^>]*>.*?<\/object>/gi, '');
  sanitized = sanitized.replace(/<embed[^>]*>.*?<\/embed>/gi, '');
  sanitized = sanitized.replace(/<link[^>]*>/gi, '');
  sanitized = sanitized.replace(/<style[^>]*>.*?<\/style>/gi, '');

  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: and data: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:text\/html/gi, '');

  // Escape remaining HTML tags
  sanitized = sanitized.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Preserve line breaks by converting \n to <br> (optional - can be removed)
  // sanitized = sanitized.replace(/\n/g, '<br>');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Sanitize username - alphanumeric, underscores, hyphens only
 */
export function sanitizeUsername(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove all non-alphanumeric characters except underscore and hyphen
  let sanitized = input.replace(/[^a-zA-Z0-9_-]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Sanitize display name - allow letters, numbers, spaces, and common punctuation
 */
export function sanitizeDisplayName(
  input: string | null | undefined,
): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Remove dangerous characters but allow letters, numbers, spaces, and common punctuation
  sanitized = sanitized.replace(/[<>{}[\]\\|`~]/g, '');

  // Escape HTML entities
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  // Remove script tags and event handlers
  sanitized = sanitized.replace(
    /javascript:|on\w+\s*=|script:|eval\(/gi,
    '',
  );

  // Trim and normalize whitespace
  sanitized = sanitized.trim().replace(/\s+/g, ' ');

  return sanitized;
}

/**
 * Sanitize URL - validate and clean URL
 */
export function sanitizeUrl(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Remove javascript: and data: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:/gi, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Sanitize an object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  fieldSanitizers?: Record<string, (value: any) => any>,
): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (sanitized.hasOwnProperty(key)) {
      const value = sanitized[key];

      // Use custom sanitizer if provided
      if (fieldSanitizers && fieldSanitizers[key]) {
        sanitized[key] = fieldSanitizers[key](value);
      } else if (typeof value === 'string') {
        // Default sanitization for strings
        sanitized[key] = sanitizeString(value) as T[Extract<keyof T, string>];
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively sanitize nested objects
        sanitized[key] = sanitizeObject(value, fieldSanitizers);
      } else if (Array.isArray(value)) {
        // Sanitize array elements
        sanitized[key] = value.map((item) =>
          typeof item === 'string'
            ? sanitizeString(item)
            : typeof item === 'object'
              ? sanitizeObject(item, fieldSanitizers)
              : item,
        );
      }
    }
  }

  return sanitized;
}

