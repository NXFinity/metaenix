declare module 'speakeasy' {
  export interface GenerateSecretOptions {
    name: string;
    issuer?: string;
    length?: number;
  }

  export interface GenerateSecretResponse {
    base32: string;
    otpauth_url: string;
    secret: string;
  }

  export interface TotpOptions {
    secret: string;
    encoding?: 'ascii' | 'hex' | 'base32' | 'base64';
    step?: number;
    window?: number;
    time?: number;
    counter?: number;
    digits?: number;
    algorithm?: 'sha1' | 'sha256' | 'sha512';
  }

  export interface OtpAuthUrlOptions {
    secret: string;
    label: string;
    issuer?: string;
    encoding?: 'ascii' | 'hex' | 'base32' | 'base64';
    type?: 'totp' | 'hotp';
    algorithm?: 'sha1' | 'sha256' | 'sha512';
    digits?: number;
    period?: number;
    counter?: number;
  }

  export interface VerifyOptions extends TotpOptions {
    token: string;
  }

  export function generateSecret(options: GenerateSecretOptions): GenerateSecretResponse;
  export function totp(options: TotpOptions): string;
  export function verify(options: VerifyOptions): boolean;
  export function generateSecretASCII(length?: number): string;
  export function otpauthURL(options: OtpAuthUrlOptions): string;

  export namespace totp {
    export function verify(options: VerifyOptions): boolean;
  }
}

