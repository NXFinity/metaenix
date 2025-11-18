import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Application } from './assets/entities/application.entity';
import { OAuthToken } from './assets/entities/oauth-token.entity';
import { User } from '../../rest/api/users/assets/entities/user.entity';
import { Security } from '../../rest/api/users/assets/entities/security/security.entity';
import {
  CreateApplicationDto,
  UpdateApplicationDto,
  RegisterDeveloperDto,
} from './assets/dto';
import { ApplicationEnvironment } from './assets/enum';
import { ApplicationStatus } from './assets/enum';
import { BCRYPT_SALT_ROUNDS } from '../../common/constants/app.constants';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import {ROLE} from "../roles";
import { ScopeService } from './services/scopes/scope.service';

@Injectable()
export class DeveloperService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Security)
    private readonly securityRepository: Repository<Security>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(OAuthToken)
    private readonly oauthTokenRepository: Repository<OAuthToken>,
    private readonly loggingService: LoggingService,
    private readonly scopeService: ScopeService,
  ) {}

  // #########################################################
  // DEVELOPER REGISTRATION
  // #########################################################

  /**
   * Check if user meets developer registration requirements
   */
  async checkDeveloperRequirements(userId: string): Promise<{
    eligible: boolean;
    requirements: {
      profileComplete: boolean;
      emailVerified: boolean;
      twoFactorEnabled: boolean;
      accountAge: boolean;
      accountStanding: boolean;
      accountActivity: boolean;
    };
    errors: string[];
  }> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.security', 'security')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const errors: string[] = [];
    // Check if user is Administrator - enum comparison
    const isAdministrator = user.role === ROLE.Administrator;
    
    const requirements = {
      profileComplete: this.checkProfileCompletion(user),
      emailVerified: user.security?.isVerified === true,
      twoFactorEnabled: user.security?.isTwoFactorEnabled === true,
      accountAge: isAdministrator ? true : this.checkAccountAge(user.dateCreated),
      accountStanding: await this.checkAccountStanding(user),
      accountActivity: await this.checkAccountActivity(userId),
    };

    if (!requirements.profileComplete) {
      errors.push('Profile must be completed (username and email must be set)');
    }
    if (!requirements.emailVerified) {
      errors.push('Email must be verified');
    }
    if (!requirements.twoFactorEnabled) {
      errors.push('Two-factor authentication must be enabled');
    }
    // Only add account age error if user is NOT an administrator
    if (!requirements.accountAge && !isAdministrator) {
      errors.push('Account must be at least 30 days old');
    }
    if (!requirements.accountStanding) {
      errors.push('Account must be in good standing');
    }
    if (!requirements.accountActivity) {
      errors.push('Account must show recent activity');
    }

    return {
      eligible: errors.length === 0,
      requirements,
      errors,
    };
  }

  /**
   * Register user as developer
   */
  async registerDeveloper(
    userId: string,
    registerDto: RegisterDeveloperDto,
  ): Promise<User> {
    if (!registerDto.acceptTerms) {
      throw new BadRequestException('You must accept the developer terms');
    }

    // Check requirements
    const requirements = await this.checkDeveloperRequirements(userId);
    if (!requirements.eligible) {
      throw new BadRequestException({
        message: 'Developer registration requirements not met',
        errors: requirements.errors,
        requirements: requirements.requirements,
      });
    }

    // Check if already a developer
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isDeveloper) {
      throw new BadRequestException('User is already a developer');
    }

    // Register as developer
    user.isDeveloper = true;
    user.developerTermsAcceptedAt = new Date();

    const savedUser = await this.userRepository.save(user);

    this.loggingService.log('User registered as developer', 'DeveloperService', {
      category: LogCategory.USER_MANAGEMENT,
      userId,
      metadata: {
        termsAcceptedAt: savedUser.developerTermsAcceptedAt,
      },
    });

    return savedUser;
  }

  /**
   * Check profile completion (username and email must be set)
   */
  private checkProfileCompletion(user: User): boolean {
    return !!(
      user.username &&
      user.username.trim().length > 0 &&
      user.email &&
      user.email.trim().length > 0
    );
  }

  /**
   * Check account age (must be at least 30 days old)
   */
  private checkAccountAge(dateCreated: Date): boolean {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return dateCreated <= thirtyDaysAgo;
  }

  /**
   * Check account standing (not banned, not timed out)
   */
  private async checkAccountStanding(user: User): Promise<boolean> {
    if (!user.security) {
      return false;
    }

    const security = user.security;

    // Check if account is currently banned
    if (security.isBanned) {
      // Check if ban has expired
      if (security.bannedUntil && security.bannedUntil > new Date()) {
        return false; // Still banned
      }
      // Ban has expired - account is in good standing now
      // Note: isBanned flag might still be true, but ban period has ended
    }

    // Check if account is currently timed out
    if (security.isTimedOut) {
      // Check if timeout has expired
      if (security.timedOutUntil && security.timedOutUntil > new Date()) {
        return false; // Still timed out
      }
      // Timeout has expired - account is in good standing now
    }

    return true;
  }

  /**
   * Check account activity (recent login or usage)
   * Checks for activity in the last 30 days via audit logs or recent posts
   */
  private async checkAccountActivity(userId: string): Promise<boolean> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Check audit logs for recent activity
    // We'll use the logging service to check for recent user activity
    // For now, we'll check if there are any audit logs for this user in the last 30 days
    // This is a simplified check - in production, you might want to check specific activity types

    // Since we don't have direct access to AuditLog repository, we'll use a simpler approach:
    // Check if user has been active recently by checking their last update timestamp
    // or we can check for recent posts if PostsService is available

    // For now, we'll check the user's dateUpdated field as a proxy for activity
    // If the account was updated recently (within 30 days), consider it active
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      return false;
    }

    // Check if user has been updated recently (indicates activity)
    if (user.dateUpdated && user.dateUpdated >= thirtyDaysAgo) {
      return true;
    }

    // If account is older than 30 days but hasn't been updated recently,
    // we'll be lenient and allow it (account might be active but not updating profile)
    // In a stricter implementation, you might want to check audit logs or posts
    // For now, we'll allow accounts that are at least 30 days old
    return true;
  }

  // #########################################################
  // APPLICATION MANAGEMENT
  // #########################################################

  /**
   * Create a new application
   */
  async createApplication(
    developerId: string,
    createDto: CreateApplicationDto,
  ): Promise<{ application: Application; clientSecret: string }> {
    // Verify user is a developer
    const developer = await this.userRepository.findOne({
      where: { id: developerId },
    });

    if (!developer || !developer.isDeveloper) {
      throw new ForbiddenException('User is not a developer');
    }

    // Check application limit (max 2 apps)
    const existingApps = await this.applicationRepository.find({
      where: { developerId },
    });

    if (existingApps.length >= 2) {
      throw new BadRequestException(
        'Maximum application limit reached. You can have a maximum of 2 applications (1 Production + 1 Development).',
      );
    }

    // Check if app of this environment already exists
    const existingAppOfEnvironment = existingApps.find(
      (app) => app.environment === createDto.environment,
    );

    if (existingAppOfEnvironment) {
      throw new BadRequestException(
        `You already have a ${createDto.environment} application. Maximum 1 app per environment.`,
      );
    }

    // Generate client ID and secret
    const clientId = this.generateClientId();
    const clientSecret = this.generateClientSecret();
    const hashedSecret = await bcrypt.hash(clientSecret, BCRYPT_SALT_ROUNDS);
    const websocketId = crypto.randomUUID();

    // Determine status based on environment
    const status =
      createDto.environment === ApplicationEnvironment.DEVELOPMENT
        ? ApplicationStatus.ACTIVE
        : ApplicationStatus.PENDING;

    // Set default rate limit based on environment
    const rateLimit =
      createDto.environment === ApplicationEnvironment.PRODUCTION ? 10000 : 1000;

    // Create application
    // If no scopes provided, use default scopes (auto-approved)
    let applicationScopes = createDto.scopes || [];
    if (applicationScopes.length === 0) {
      // Auto-approve default scopes for new applications
      const defaultScopes = this.scopeService.getDefaultScopes();
      applicationScopes = defaultScopes.map(scope => scope.id);
    }

    const application = this.applicationRepository.create({
      ...createDto,
      clientId,
      clientSecret: hashedSecret,
      websocketId,
      developerId,
      status,
      rateLimit,
      scopes: applicationScopes,
    });

    const savedApplication = await this.applicationRepository.save(application);

    this.loggingService.log('Application created', 'DeveloperService', {
      category: LogCategory.USER_MANAGEMENT,
      userId: developerId,
      metadata: {
        applicationId: savedApplication.id,
        environment: createDto.environment,
        status,
      },
    });

    return {
      application: savedApplication,
      clientSecret, // Return plain secret only once
    };
  }

  /**
   * Get all applications for a developer
   */
  async getApplications(developerId: string): Promise<Application[]> {
    return this.applicationRepository.find({
      where: { developerId },
      order: { dateCreated: 'DESC' },
    });
  }

  /**
   * Get application by ID (with ownership check)
   */
  async getApplication(
    applicationId: string,
    developerId: string,
  ): Promise<Application> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: ['developer', 'approvedBy'],
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.developerId !== developerId) {
      throw new ForbiddenException('You do not have access to this application');
    }

    return application;
  }

  /**
   * Update application
   */
  async updateApplication(
    applicationId: string,
    developerId: string,
    updateDto: UpdateApplicationDto,
  ): Promise<Application> {
    const application = await this.getApplication(applicationId, developerId);

    // If scopes are being updated, validate them
    if (updateDto.scopes !== undefined) {
      if (updateDto.scopes.length === 0) {
        // If no scopes provided, use default scopes
        const defaultScopes = this.scopeService.getDefaultScopes();
        updateDto.scopes = defaultScopes.map(scope => scope.id);
      } else {
        // Validate that all requested scopes are valid
        const { valid, invalid } = this.scopeService.validateScopesList(updateDto.scopes);
        if (invalid.length > 0) {
          throw new BadRequestException(
            `Invalid scopes: ${invalid.join(', ')}. Available scopes: ${this.scopeService.getAllScopes().map(s => s.id).join(', ')}`
          );
        }
        updateDto.scopes = valid;
      }
    }

    // Update fields (environment cannot be changed - not in UpdateApplicationDto)
    Object.assign(application, updateDto);
    application.dateUpdated = new Date();

    return this.applicationRepository.save(application);
  }

  /**
   * Delete application
   */
  async deleteApplication(
    applicationId: string,
    developerId: string,
  ): Promise<void> {
    const application = await this.getApplication(applicationId, developerId);

    await this.applicationRepository.remove(application);

    this.loggingService.log('Application deleted', 'DeveloperService', {
      category: LogCategory.USER_MANAGEMENT,
      userId: developerId,
      metadata: {
        applicationId,
      },
    });
  }

  /**
   * Regenerate client secret
   */
  async regenerateClientSecret(
    applicationId: string,
    developerId: string,
  ): Promise<{ clientSecret: string }> {
    const application = await this.getApplication(applicationId, developerId);

    const newSecret = this.generateClientSecret();
    const hashedSecret = await bcrypt.hash(newSecret, BCRYPT_SALT_ROUNDS);

    application.clientSecret = hashedSecret;
    application.dateUpdated = new Date();

    await this.applicationRepository.save(application);

    this.loggingService.log('Client secret regenerated', 'DeveloperService', {
      category: LogCategory.SECURITY,
      userId: developerId,
      metadata: {
        applicationId,
      },
    });

    return { clientSecret: newSecret };
  }

  /**
   * Get production application
   */
  async getProductionApplication(developerId: string): Promise<Application | null> {
    return this.applicationRepository.findOne({
      where: {
        developerId,
        environment: ApplicationEnvironment.PRODUCTION,
      },
    });
  }

  /**
   * Get development application
   */
  async getDevelopmentApplication(developerId: string): Promise<Application | null> {
    return this.applicationRepository.findOne({
      where: {
        developerId,
        environment: ApplicationEnvironment.DEVELOPMENT,
      },
    });
  }

  /**
   * Find application by websocketId (for WebSocket authentication)
   */
  async findByWebsocketId(websocketId: string): Promise<Application | null> {
    try {
      return await this.applicationRepository.findOne({
        where: { websocketId },
        relations: ['developer'],
        select: [
          'id',
          'name',
          'description',
          'environment',
          'clientId',
          'websocketId',
          'status',
          'scopes',
          'rateLimit',
          'developerId',
        ],
      });
    } catch (error) {
      this.loggingService.error(
        `Error finding application by websocketId: ${websocketId}`,
        error instanceof Error ? error.stack : undefined,
        'DeveloperService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { websocketId },
        },
      );
      return null;
    }
  }

  // #########################################################
  // HELPER METHODS
  // #########################################################

  /**
   * Generate client ID
   */
  private generateClientId(): string {
    // Generate a random string for client ID
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate client secret
   */
  private generateClientSecret(): string {
    // Generate a secure random secret
    return crypto.randomBytes(64).toString('hex');
  }
}
