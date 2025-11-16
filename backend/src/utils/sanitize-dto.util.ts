import { Transform } from 'class-transformer';
import {
  sanitizeString,
  sanitizeText,
  sanitizeUsername,
  sanitizeDisplayName,
  sanitizeUrl,
} from './sanitization.util';

/**
 * Decorator to sanitize a string field
 */
export const SanitizeString = () =>
  Transform(({ value }) => (value ? sanitizeString(value) : value));

/**
 * Decorator to sanitize text field (allows line breaks, removes dangerous HTML)
 */
export const SanitizeText = () =>
  Transform(({ value }) => (value ? sanitizeText(value) : value));

/**
 * Decorator to sanitize username field
 */
export const SanitizeUsername = () =>
  Transform(({ value }) => (value ? sanitizeUsername(value) : value));

/**
 * Decorator to sanitize display name field
 */
export const SanitizeDisplayName = () =>
  Transform(({ value }) => (value ? sanitizeDisplayName(value) : value));

/**
 * Decorator to sanitize URL field
 */
export const SanitizeUrl = () =>
  Transform(({ value }) => (value ? sanitizeUrl(value) : value));

