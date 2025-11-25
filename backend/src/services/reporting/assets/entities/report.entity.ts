import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '@database/database';
import { User } from '../../../../rest/api/users/assets/entities/user.entity';
import { ReportResourceType } from '../enum/resource-type.enum';
import { ReportReason } from '../enum/report-reason.enum';
import { ReportStatus } from '../enum/report-status.enum';

/**
 * Report Entity
 *
 * Universal reporting system that can be attached to any resource type
 * (posts, videos, photos)
 */
@Entity('contentReport', { schema: 'social' })
@Unique(['userId', 'resourceType', 'resourceId']) // Prevent duplicate reports at database level
@Index(['resourceType', 'resourceId', 'dateCreated'])
@Index(['userId', 'dateCreated'])
@Index(['status', 'dateCreated'])
@Index(['resourceType', 'status', 'dateCreated'])
export class Report extends BaseEntity {
  // #########################################################
  // Reporter Information
  // #########################################################
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  reporter!: User;

  @Column({ nullable: false })
  userId!: string;

  // #########################################################
  // Resource Reference (Universal)
  // #########################################################
  /**
   * Resource Type - what resource this report is on
   * e.g., 'post', 'video', 'photo'
   */
  @Column({
    type: 'enum',
    enum: ReportResourceType,
    nullable: false,
  })
  resourceType!: ReportResourceType;

  /**
   * Resource ID - the ID of the resource this report is on
   */
  @Column({ type: 'uuid', nullable: false })
  resourceId!: string;

  // #########################################################
  // Report Details
  // #########################################################
  @Column({
    type: 'enum',
    enum: ReportReason,
    nullable: false,
  })
  reason!: ReportReason;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // #########################################################
  // Review Information
  // #########################################################
  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status!: ReportStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reviewedBy!: string | null; // Admin user ID who reviewed

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt!: Date | null;
}

