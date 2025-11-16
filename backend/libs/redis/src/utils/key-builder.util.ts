/**
 * Build Redis key with prefix and namespace
 */
export class KeyBuilder {
  private prefix: string;

  constructor(prefix: string = 'app') {
    this.prefix = prefix;
  }

  /**
   * Build a key with prefix
   */
  build(...parts: (string | number | undefined)[]): string {
    const filtered = parts.filter(p => p !== undefined && p !== null);
    return `${this.prefix}:${filtered.join(':')}`;
  }

  /**
   * Build a key for a specific namespace
   */
  namespace(namespace: string): KeyBuilder {
    return new KeyBuilder(`${this.prefix}:${namespace}`);
  }

  /**
   * Build user-specific key
   */
  user(userId: string, ...parts: string[]): string {
    return this.build('user', userId, ...parts);
  }

  /**
   * Build session key
   */
  session(sessionId: string): string {
    return this.build('session', sessionId);
  }

  /**
   * Build cache key
   */
  cache(...parts: string[]): string {
    return this.build('cache', ...parts);
  }

  /**
   * Build lock key
   */
  lock(resource: string, identifier?: string): string {
    return this.build('lock', resource, identifier);
  }

  /**
   * Build rate limit key
   */
  rateLimit(identifier: string, action: string): string {
    return this.build('ratelimit', identifier, action);
  }

  /**
   * Build tag key for cache invalidation
   */
  tag(tag: string): string {
    return this.build('tag', tag);
  }
}

