import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { OAuthService } from './oauth.service';
import { Application } from '../../assets/entities/application.entity';
import { OAuthToken } from '../../assets/entities/oauth-token.entity';
import { LoggingService } from '@logging/logging';
import { ScopeService } from '../scopes/scope.service';
import { RedisService } from '@redis/redis';
import { ApplicationStatus } from '../../assets/enum/application-status.enum';
import { GrantType } from '../../assets/dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

jest.mock('bcrypt');
jest.mock('crypto');

describe('OAuthService', () => {
  let service: OAuthService;
  let applicationRepository: jest.Mocked<Repository<Application>>;
  let oauthTokenRepository: jest.Mocked<Repository<OAuthToken>>;
  let jwtService: jest.Mocked<JwtService>;
  let scopeService: jest.Mocked<ScopeService>;

  const mockApplication: Partial<Application> = {
    id: 'app-123',
    clientId: 'test-client-id',
    clientSecret: 'hashed-secret',
    redirectUris: ['https://example.com/callback'],
    status: ApplicationStatus.ACTIVE,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthService,
        {
          provide: getRepositoryToken(Application),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(OAuthToken),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ScopeService,
          useValue: {
            validateScopesList: jest.fn(),
            getAllScopes: jest.fn(),
          },
        },
        {
          provide: LoggingService,
          useValue: {
            error: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OAuthService>(OAuthService);
    applicationRepository = module.get(getRepositoryToken(Application));
    oauthTokenRepository = module.get(getRepositoryToken(OAuthToken));
    jwtService = module.get(JwtService);
    scopeService = module.get(ScopeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authorize', () => {
    it('should successfully generate authorization code', async () => {
      const authorizeDto = {
        responseType: 'code',
        clientId: 'test-client-id',
        redirectUri: 'https://example.com/callback',
        scope: 'read:user write:user',
        state: 'test-state',
      };

      applicationRepository.findOne.mockResolvedValue(mockApplication as Application);
      scopeService.validateScopesList.mockReturnValue({
        valid: ['read:user', 'write:user'],
        invalid: [],
      });
      scopeService.getAllScopes.mockReturnValue([
        { id: 'read:user' },
        { id: 'write:user' },
      ] as any);
      (crypto.randomBytes as jest.Mock) = jest.fn().mockReturnValue(Buffer.from('test-code'));

      const result = await service.authorize(authorizeDto, 'user-123');

      expect(result).toHaveProperty('code');
      expect(result.state).toBe('test-state');
    });

    it('should throw error if application not found', async () => {
      applicationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.authorize(
          {
            responseType: 'code',
            clientId: 'invalid',
            redirectUri: 'https://example.com/callback',
            scope: 'read:user',
          },
          'user-123',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if redirect URI invalid', async () => {
      applicationRepository.findOne.mockResolvedValue(mockApplication as Application);

      await expect(
        service.authorize(
          {
            responseType: 'code',
            clientId: 'test-client-id',
            redirectUri: 'https://evil.com/callback',
            scope: 'read:user',
          },
          'user-123',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('token', () => {
    it('should successfully exchange authorization code for tokens', async () => {
      const tokenDto = {
        grantType: GrantType.AUTHORIZATION_CODE,
        code: 'test-code',
        redirectUri: 'https://example.com/callback',
        clientId: 'test-client-id',
        clientSecret: 'test-secret',
      };

      const mockAuthCode = {
        code: 'test-code',
        clientId: 'test-client-id',
        userId: 'user-123',
        redirectUri: 'https://example.com/callback',
        scopes: ['read:user'],
      };

      redisService.get.mockResolvedValue(JSON.stringify(mockAuthCode));
      redisService.del.mockResolvedValue(1);
      applicationRepository.findOne.mockResolvedValue(mockApplication as Application);
      (bcrypt.compare as jest.Mock) = jest.fn().mockResolvedValue(true);
      jwtService.sign.mockReturnValue('access-token');
      (crypto.createHash as jest.Mock) = jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hashed-token'),
      }));
      oauthTokenRepository.save.mockResolvedValue({} as OAuthToken);

      const result = await service.token(tokenDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw error if code invalid', async () => {
      (service as any).redisService.get.mockResolvedValue(null);

      await expect(
        service.token({
          grantType: GrantType.AUTHORIZATION_CODE,
          code: 'invalid-code',
          redirectUri: 'https://example.com/callback',
          clientId: 'test-client-id',
          clientSecret: 'test-secret',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revoke', () => {
    it('should successfully revoke token', async () => {
      const revokeDto = {
        token: 'test-token',
        tokenTypeHint: 'access_token' as const,
      };

      const mockToken = {
        id: 'token-123',
        accessToken: 'test-token',
        refreshToken: 'refresh-token',
        userId: 'user-123',
        revoked: false,
      } as OAuthToken;

      (crypto.createHash as jest.Mock) = jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hashed-token'),
      }));
      oauthTokenRepository.findOne.mockResolvedValue(mockToken);
      (bcrypt.compare as jest.Mock) = jest.fn().mockResolvedValue(true);
      oauthTokenRepository.save.mockResolvedValue({ ...mockToken, revoked: true } as OAuthToken);

      await service.revoke(revokeDto);

      expect(oauthTokenRepository.save).toHaveBeenCalled();
    });
  });

  describe('introspect', () => {
    it('should successfully introspect valid token', async () => {
      const introspectDto = { token: 'test-token' };
      const mockToken = {
        accessToken: 'test-token',
        userId: 'user-123',
        scopes: ['read:user'],
        expiresAt: new Date(Date.now() + 3600000),
        revoked: false,
      } as OAuthToken;

      jwtService.decode = jest.fn().mockReturnValue(null);
      (crypto.createHash as jest.Mock) = jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hashed-token'),
      }));
      oauthTokenRepository.findOne.mockResolvedValue(mockToken);

      const result = await service.introspect(introspectDto);

      expect(result.active).toBe(true);
      expect(result.username).toBe('user-123');
    });

    it('should return inactive for invalid token', async () => {
      oauthTokenRepository.findOne.mockResolvedValue(null);

      const result = await service.introspect({ token: 'invalid' });

      expect(result.active).toBe(false);
    });
  });
});

