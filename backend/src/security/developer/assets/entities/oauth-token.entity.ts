import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '@database/database';
import { Application } from './application.entity';
import { User } from '../../../../rest/api/users/assets/entities/user.entity';
import { TokenType } from '../enum/token-type.enum';

@Entity('oauth_token', { schema: 'developers' })
@Unique(['accessToken'])
@Index(['applicationId'])
@Index(['userId'])
@Index(['revoked'])
@Index(['expiresAt'])
@Index(['accessTokenHash']) // Index for fast token lookup
@Index(['refreshTokenHash']) // Index for fast refresh token lookup
export class OAuthToken extends BaseEntity {
  @Column({ type: 'varchar', unique: true })
  accessToken!: string; // Hashed with bcrypt (for verification)

  @Column({ type: 'varchar', nullable: true, unique: true })
  refreshToken!: string | null; // Hashed with bcrypt (for verification), nullable

  @Column({ type: 'varchar', length: 64, nullable: true, unique: true })
  accessTokenHash!: string | null; // SHA-256 hash for fast lookup (indexed)

  @Column({ type: 'varchar', length: 64, nullable: true, unique: true })
  refreshTokenHash!: string | null; // SHA-256 hash for fast lookup (indexed)

  @Column({
    type: 'enum',
    enum: TokenType,
    default: TokenType.BEARER,
  })
  tokenType!: TokenType;

  @Column('simple-array')
  scopes!: string[];

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  refreshExpiresAt!: Date | null;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'applicationId' })
  application!: Application;

  @Column()
  applicationId!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'varchar', nullable: true })
  userId!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  code!: string | null; // Authorization code

  @Column({ type: 'timestamp', nullable: true })
  codeExpiresAt!: Date | null;

  @Column({ default: false })
  revoked!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastUsed!: Date | null;
}

