import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { ROLE } from '../../../../src/security/roles';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import { BCRYPT_SALT_ROUNDS } from '../../../../src/common/constants/app.constants';

interface SeedUser {
  username: string;
  email: string;
  password: string;
  displayName: string;
  role: ROLE;
}

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);
  private readonly seedFilePath = (() => {
    // In development, use source file location
    // In production, seed service doesn't run (only runs in development)
    const sourcePath = path.join(
      process.cwd(),
      'libs',
      'database',
      'src',
      'seed',
      'json',
      'seed_user.json',
    );
    return sourcePath;
  })();

  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly configService: ConfigService,
    private readonly loggingService: LoggingService,
  ) {}

  async onModuleInit() {
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    
    // Only run seeding in development environment
    if (nodeEnv !== 'development') {
      this.logger.debug(`SeedService skipped - NODE_ENV is '${nodeEnv}', only runs in 'development'`);
      return;
    }

    this.logger.log('SeedService initialized - will seed database in development mode');
    
    // Wait for database to be ready
    setTimeout(async () => {
      await this.seed();
    }, 3000);
  }

  /**
   * Main seed method - seeds system admin and users from JSON
   * Only runs in development environment
   */
  async seed(): Promise<void> {
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    
    // Double-check environment - safety guard
    if (nodeEnv !== 'development') {
      this.logger.warn(`SeedService.seed() called in non-development environment (NODE_ENV: ${nodeEnv}). Skipping.`);
      return;
    }

    this.logger.log('Starting database seeding...');

    try {
      // Seed system admin account
      await this.seedSystemAdmin();

      // Seed users from JSON file
      await this.seedUsersFromJson();

      this.logger.log('Database seeding completed successfully');
    } catch (error) {
      this.loggingService.error(
        'Error during database seeding',
        error instanceof Error ? error.stack : undefined,
        'SeedService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      this.logger.error(
        `Database seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Seed or update system admin account from environment variables
   */
  async seedSystemAdmin(): Promise<void> {
    const systemUsername = this.configService.get<string>('SYSTEM_USERNAME');
    const systemEmail = this.configService.get<string>('SYSTEM_EMAIL');
    const systemPassword = this.configService.get<string>('SYSTEM_PASSWORD');

    if (!systemUsername || !systemEmail || !systemPassword) {
      this.logger.warn(
        'System admin credentials not found in environment variables. Skipping system admin seeding.',
      );
      return;
    }

    try {
      // Check if system admin exists
      // Use entity class name - TypeORM will resolve it via autoLoadEntities
      const userRepository = this.entityManager.getRepository('user');
      const existingUser = await userRepository.findOne({
        where: [{ email: systemEmail }, { username: systemUsername }],
        relations: ['profile', 'privacy', 'security'],
      });

      const hashedPassword = await bcrypt.hash(
        systemPassword,
        BCRYPT_SALT_ROUNDS,
      );

      if (existingUser) {
        // Update existing system admin
        this.logger.log('Updating existing system admin account...');

        // Update user fields
        existingUser.username = systemUsername;
        existingUser.email = systemEmail;
        existingUser.password = hashedPassword;
        existingUser.role = ROLE.Administrator;
        existingUser.displayName = systemUsername;
        existingUser.isPublic = true;

        // Ensure websocketId exists
        if (!existingUser.websocketId) {
          existingUser.websocketId = crypto.randomUUID();
        }

        await userRepository.save(existingUser);

        // Update or create related entities
        await this.ensureRelatedEntities(existingUser);

        this.logger.log(
          `System admin account updated: ${systemUsername} (${systemEmail})`,
        );
      } else {
        // Create new system admin
        this.logger.log('Creating new system admin account...');

        const websocketId = crypto.randomUUID();

        const newUser = userRepository.create({
          username: systemUsername,
          email: systemEmail,
          password: hashedPassword,
          displayName: systemUsername,
          websocketId,
          role: ROLE.Administrator,
          isPublic: true,
        });

        const savedUser = await userRepository.save(newUser);

        // Create related entities
        await this.createRelatedEntities(savedUser);

        this.logger.log(
          `System admin account created: ${systemUsername} (${systemEmail})`,
        );
      }
    } catch (error) {
      this.loggingService.error(
        `Error seeding system admin: ${systemEmail}`,
        error instanceof Error ? error.stack : undefined,
        'SeedService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { email: systemEmail, username: systemUsername },
        },
      );
      throw error;
    }
  }

  /**
   * Seed users from JSON file
   */
  async seedUsersFromJson(): Promise<void> {
    try {
      // Check if seed file exists
      if (!fs.existsSync(this.seedFilePath)) {
        this.logger.warn(
          `Seed file not found: ${this.seedFilePath}. Skipping user seeding.`,
        );
        return;
      }

      // Read and parse seed file
      const seedFileContent = fs.readFileSync(this.seedFilePath, 'utf-8');
      const seedUsers: SeedUser[] = JSON.parse(seedFileContent);

      if (!Array.isArray(seedUsers) || seedUsers.length === 0) {
        this.logger.warn(
          'Seed file is empty or invalid. Skipping user seeding.',
        );
        return;
      }

      this.logger.log(`Found ${seedUsers.length} users to seed`);

      // Seed each user
      for (const seedUser of seedUsers) {
        await this.seedUser(seedUser);
      }

      this.logger.log(`Successfully seeded ${seedUsers.length} users`);
    } catch (error) {
      this.loggingService.error(
        'Error reading or parsing seed file',
        error instanceof Error ? error.stack : undefined,
        'SeedService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { filePath: this.seedFilePath },
        },
      );
      throw error;
    }
  }

  /**
   * Seed or update a single user
   */
  async seedUser(seedUser: SeedUser): Promise<void> {
    try {
      // Validate seed user data
      if (!seedUser.username || !seedUser.email || !seedUser.password) {
        this.logger.warn(
          `Invalid seed user data: missing required fields. Skipping user: ${seedUser.username || seedUser.email}`,
        );
        return;
      }

      // Check if user exists
      // Get repository using entity metadata - avoids circular dependency
      const userRepository = this.entityManager.getRepository(
        this.entityManager.connection.getMetadata('user').target,
      );
      const existingUser = await userRepository.findOne({
        where: [{ email: seedUser.email }, { username: seedUser.username }],
        relations: ['profile', 'privacy', 'security'],
      });

      const hashedPassword = await bcrypt.hash(
        seedUser.password,
        BCRYPT_SALT_ROUNDS,
      );

      if (existingUser) {
        // Update existing user
        this.logger.debug(`Updating existing user: ${seedUser.username}`);

        // Update user fields (preserve existing data, only update seed-provided fields)
        existingUser.username = seedUser.username;
        existingUser.email = seedUser.email;
        existingUser.password = hashedPassword;
        existingUser.displayName = seedUser.displayName || seedUser.username;
        existingUser.role = seedUser.role || ROLE.Member;

        // Ensure websocketId exists
        if (!existingUser.websocketId) {
          existingUser.websocketId = crypto.randomUUID();
        }

        await userRepository.save(existingUser);

        // Update or create related entities
        await this.ensureRelatedEntities(existingUser);

        this.logger.debug(`User updated: ${seedUser.username}`);
      } else {
        // Create new user
        this.logger.debug(`Creating new user: ${seedUser.username}`);

        const websocketId = crypto.randomUUID();

        const newUser = userRepository.create({
          username: seedUser.username,
          email: seedUser.email,
          password: hashedPassword,
          displayName: seedUser.displayName || seedUser.username,
          websocketId,
          role: seedUser.role || ROLE.Member,
          isPublic: true,
        });

        const savedUser = await userRepository.save(newUser);

        // Create related entities
        await this.createRelatedEntities(savedUser);

        this.logger.debug(`User created: ${seedUser.username}`);
      }
    } catch (error) {
      this.loggingService.error(
        `Error seeding user: ${seedUser.username || seedUser.email}`,
        error instanceof Error ? error.stack : undefined,
        'SeedService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { username: seedUser.username, email: seedUser.email },
        },
      );
      // Continue with other users even if one fails
      this.logger.warn(
        `Failed to seed user ${seedUser.username}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Create related entities for a user (Profile, Privacy, Security)
   */
  private async createRelatedEntities(user: any): Promise<void> {
    await this.entityManager.transaction(async (manager) => {
      const ProfileEntity = manager.getRepository(
        manager.connection.getMetadata('userProfile').target,
      );
      const PrivacyEntity = manager.getRepository(
        manager.connection.getMetadata('userPrivacy').target,
      );
      const SecurityEntity = manager.getRepository(
        manager.connection.getMetadata('userSecurity').target,
      );

      // Create Profile
      const profile = ProfileEntity.create({
        user,
      });
      await ProfileEntity.save(profile);

      // Create Privacy
      const privacy = PrivacyEntity.create({
        user,
      });
      await PrivacyEntity.save(privacy);

      // Create Security
      const security = SecurityEntity.create({
        user,
        isVerified: true, // Seed users are pre-verified
        isTwoFactorEnabled: false,
        isBanned: false,
        isTimedOut: false,
        isAgedVerified: false,
      });
      await SecurityEntity.save(security);
    });
  }

  /**
   * Ensure related entities exist for a user (update or create)
   * This method ensures that when new entities are added to the system,
   * existing seeded users get updated with those entities
   */
  private async ensureRelatedEntities(user: any): Promise<void> {
    await this.entityManager.transaction(async (manager) => {
      const ProfileEntity = manager.getRepository(
        manager.connection.getMetadata('userProfile').target,
      );
      const PrivacyEntity = manager.getRepository(
        manager.connection.getMetadata('userPrivacy').target,
      );
      const SecurityEntity = manager.getRepository(
        manager.connection.getMetadata('userSecurity').target,
      );

      // Ensure Profile exists
      let profile = await ProfileEntity.findOne({
        where: { user: { id: user.id } },
      });
      if (!profile) {
        profile = ProfileEntity.create({ user });
        await ProfileEntity.save(profile);
      }

      // Ensure Privacy exists
      let privacy = await PrivacyEntity.findOne({
        where: { user: { id: user.id } },
      });
      if (!privacy) {
        privacy = PrivacyEntity.create({ user });
        await PrivacyEntity.save(privacy);
      }

      // Ensure Security exists
      let security = await SecurityEntity.findOne({
        where: { user: { id: user.id } },
      });
      if (!security) {
        security = SecurityEntity.create({
          user,
          isVerified: true, // Seed users are pre-verified
          isTwoFactorEnabled: false,
          isBanned: false,
          isTimedOut: false,
          isAgedVerified: false,
        });
        await SecurityEntity.save(security);
      } else {
        // Update security to ensure seed users are verified
        if (!security.isVerified) {
          security.isVerified = true;
          security.dateVerified = new Date();
          await SecurityEntity.save(security);
        }
      }
    });
  }
}
