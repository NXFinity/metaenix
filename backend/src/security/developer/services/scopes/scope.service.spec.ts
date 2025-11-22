import { Test, TestingModule } from '@nestjs/testing';
import { ScopeService } from './scope.service';

describe('ScopeService', () => {
  let service: ScopeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScopeService],
    }).compile();

    service = module.get<ScopeService>(ScopeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllScopes', () => {
    it('should return all available scopes', () => {
      const scopes = service.getAllScopes();
      expect(Array.isArray(scopes)).toBe(true);
      expect(scopes.length).toBeGreaterThan(0);
    });
  });

  describe('validateScopesList', () => {
    it('should validate scope list', () => {
      const result = service.validateScopesList(['read:user', 'write:user']);
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('invalid');
    });
  });
});

