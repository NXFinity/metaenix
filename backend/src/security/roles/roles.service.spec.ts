import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { ROLE } from './assets/enum/role.enum';
import { AbilityFactory } from './assets/factories/ability.factory';

describe('RolesService', () => {
  let service: RolesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: AbilityFactory,
          useValue: {
            createForUser: jest.fn(() => ({
              can: jest.fn(() => true),
              cannot: jest.fn(() => false),
            })),
          },
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRolePermissions', () => {
    it('should return permissions for a role', () => {
      const permissions = service.getRolePermissions(ROLE.Member);
      expect(permissions).toBeDefined();
      expect(Array.isArray(permissions)).toBe(true);
    });
  });

  describe('hasPermission', () => {
    it('should check if role has permission', () => {
      const hasPermission = service.hasPermission(ROLE.Member, 'read:user' as any);
      expect(typeof hasPermission).toBe('boolean');
    });
  });

  describe('hasAnyPermission', () => {
    it('should check if role has any permission', () => {
      const hasAny = service.hasAnyPermission(ROLE.Member, ['read:user', 'write:user'] as any[]);
      expect(typeof hasAny).toBe('boolean');
    });
  });

  describe('hasAllPermissions', () => {
    it('should check if role has all permissions', () => {
      const hasAll = service.hasAllPermissions(ROLE.Member, ['read:user'] as any[]);
      expect(typeof hasAll).toBe('boolean');
    });
  });

  describe('getAllRoles', () => {
    it('should return all roles', () => {
      const roles = service.getAllRoles();
      expect(Array.isArray(roles)).toBe(true);
    });
  });

  describe('getAllPermissions', () => {
    it('should return all permissions', () => {
      const permissions = service.getAllPermissions();
      expect(Array.isArray(permissions)).toBe(true);
    });
  });
});

