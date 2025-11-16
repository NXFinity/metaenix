import { BaseEntity } from '@database/database';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { User } from '../user.entity';

@Entity('userSecurity', { schema: 'account' })
@Index(['verificationToken'])
@Index(['passwordResetToken'])
@Index(['isVerified'])
@Index(['isBanned'])
@Index(['isTimedOut'])
@Index(['isVerified', 'isBanned', 'isTimedOut']) // Composite index for login checks
@Index(['verificationToken', 'isVerified']) // Composite index for verification lookups
export class Security extends BaseEntity {
  // User Verification
  @Column({ type: 'varchar', nullable: true })
  verificationToken: string | null;
  @Column({ type: 'boolean', default: false })
  isVerified: boolean;
  @Column({ type: 'timestamptz', nullable: true })
  dateVerified: Date | null;
  // ########################################################

  // User Refresh
  @Column({ type: 'varchar', nullable: true })
  refreshToken: string;
  // ########################################################

  // Password Reset
  @Column({ type: 'varchar', nullable: true })
  passwordResetToken: string | null;
  @Column({ type: 'timestamptz', nullable: true })
  passwordResetTokenExpires: Date | null;
  // ########################################################

  // User Two Factor
  @Column({ type: 'boolean', default: false })
  isTwoFactorEnabled: boolean;
  @Column({ type: 'varchar', nullable: true })
  twoFactorSecret: string | null; // Encrypted TOTP secret
  @Column({ type: 'varchar', nullable: true })
  twoFactorToken: string | null; // Temporary token during setup
  @Column({ type: 'simple-array', nullable: true })
  twoFactorBackupCodes: string[] | null; // Hashed backup codes
  @Column({ type: 'timestamptz', nullable: true })
  twoFactorEnabledAt: Date | null; // When 2FA was enabled
  @Column({ type: 'timestamptz', nullable: true })
  twoFactorLastVerified: Date | null; // Last time 2FA was verified
  @Column({ type: 'timestamptz', nullable: true })
  twoFactorBackupCodesGeneratedAt: Date | null; // When backup codes were generated
  // ########################################################

  // User Moderation - Bans
  @Column({ type: 'boolean', default: false })
  isBanned: boolean;
  @Column({ type: 'varchar', nullable: true })
  banReason: string;
  @Column({ type: 'timestamptz', nullable: true })
  bannedUntil: Date;
  @ManyToOne(() => User, { nullable: true })
  bannedBy: User;
  @Column({ type: 'timestamptz', nullable: true })
  bannedAt: Date;
  // ########################################################

  // User Moderation - Timed Out
  @Column({ type: 'boolean', default: false })
  isTimedOut: boolean;
  @Column({ type: 'varchar', nullable: true })
  timeoutReason: string;
  @Column({ type: 'timestamptz', nullable: true })
  timedOutUntil: Date;
  @ManyToOne(() => User, { nullable: true })
  timedOutBy: User;
  // ########################################################

  // User Age Verification
  @Column({ type: 'boolean', default: false })
  isAgedVerified: boolean;
  @Column({ type: 'timestamptz', nullable: true })
  agedVerifiedDate: Date;
  // ########################################################

  @OneToOne(() => User, (user) => user.security, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'securityId' })
  user: User;
}
