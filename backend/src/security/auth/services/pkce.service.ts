import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class PkceService {
  /**
   * Generate a cryptographically random code verifier
   * @param length Length of the verifier (43-128 characters)
   * @returns Base64 URL-encoded code verifier
   */
  generateCodeVerifier(length: number = 128): string {
    if (length < 43 || length > 128) {
      throw new Error(
        'Code verifier length must be between 43 and 128 characters',
      );
    }

    const randomBytes = crypto.randomBytes(length);
    return this.base64URLEncode(randomBytes).substring(0, length);
  }

  /**
   * Generate a code challenge from the code verifier using S256 method
   * @param codeVerifier The code verifier string
   * @returns Base64 URL-encoded code challenge
   */
  generateCodeChallenge(codeVerifier: string): string {
    const hash = crypto.createHash('sha256').update(codeVerifier).digest();
    return this.base64URLEncode(hash);
  }

  /**
   * Generate both code verifier and challenge
   * @returns Object containing both verifier and challenge
   */
  generatePkcePair(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    return {
      codeVerifier,
      codeChallenge,
    };
  }

  /**
   * Verify that a code verifier matches a code challenge
   * @param codeVerifier The code verifier to test
   * @param codeChallenge The code challenge to verify against
   * @returns True if verifier matches challenge
   */
  verifyCodeChallenge(codeVerifier: string, codeChallenge: string): boolean {
    const computedChallenge = this.generateCodeChallenge(codeVerifier);
    return computedChallenge === codeChallenge;
  }

  /**
   * Base64 URL encode a buffer
   * @param buffer Buffer to encode
   * @returns Base64 URL-encoded string
   */
  private base64URLEncode(buffer: Buffer): string {
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate a random state parameter for OAuth
   * @param length Length of the state string
   * @returns Random state string
   */
  generateState(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}
