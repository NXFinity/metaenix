import { Test, TestingModule } from '@nestjs/testing';
import { PkceService } from './pkce.service';
import * as crypto from 'crypto';

jest.mock('crypto');

describe('PkceService', () => {
  let service: PkceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PkceService],
    }).compile();

    service = module.get<PkceService>(PkceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateCodeVerifier', () => {
    it('should generate code verifier', () => {
      (crypto.randomBytes as jest.Mock) = jest.fn().mockReturnValue(Buffer.from('test'));
      const verifier = service.generateCodeVerifier();
      expect(verifier).toBeDefined();
      expect(typeof verifier).toBe('string');
      expect(verifier.length).toBeGreaterThan(0);
    });
  });

  describe('generateCodeChallenge', () => {
    it('should generate code challenge from verifier', () => {
      (crypto.createHash as jest.Mock) = jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(Buffer.from('test-hash')),
      }));
      const verifier = 'test-verifier';
      const challenge = service.generateCodeChallenge(verifier);
      expect(challenge).toBeDefined();
      expect(typeof challenge).toBe('string');
    });
  });

  describe('verifyCodeChallenge', () => {
    it('should verify code challenge', () => {
      (crypto.createHash as jest.Mock) = jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(Buffer.from('test-hash')),
      }));
      const verifier = 'test-verifier';
      const challenge = service.generateCodeChallenge(verifier);
      const isValid = service.verifyCodeChallenge(verifier, challenge);
      expect(isValid).toBe(true);
    });
  });
});

