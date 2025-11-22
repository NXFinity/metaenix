import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@database/database';
import { User } from '../../../../rest/api/users/assets/entities/user.entity';

/**
 * ViewTrack Entity
 *
 * Centralized entity for tracking views across all resources (profiles, posts, videos, etc.)
 */
@Entity('viewTrack', { schema: 'data' })
@Index(['resourceType', 'resourceId', 'dateCreated'])
@Index(['userId', 'dateCreated'])
@Index(['countryCode', 'dateCreated'])
@Index(['userId', 'countryCode'])
@Index(['resourceType', 'resourceId', 'viewerUserId', 'dateCreated'])
@Index(['resourceType', 'resourceId', 'ipAddress', 'dateCreated'])
export class ViewTrack extends BaseEntity {
  /**
   * Resource Type - what is being viewed
   * e.g., 'profile', 'post', 'video'
   */
  @Column({ type: 'varchar', length: 50 })
  resourceType!: string;

  /**
   * Resource ID - the ID of the resource being viewed
   */
  @Column({ type: 'uuid' })
  resourceId!: string;

  /**
   * User ID - the owner of the resource being viewed
   * For profiles: userId = resourceId
   * For posts/videos: userId = owner of the post/video
   */
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  /**
   * IP Address of the viewer
   */
  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null; // IPv4 or IPv6

  /**
   * Geographic Data
   */
  @Column({ type: 'varchar', length: 2, nullable: true })
  countryCode!: string | null; // ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB')

  @Column({ type: 'varchar', length: 100, nullable: true })
  countryName!: string | null; // Full country name (e.g., 'United States')

  @Column({ type: 'varchar', length: 100, nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  region!: string | null; // State/Province code

  /**
   * Viewer User ID - if the viewer is authenticated
   */
  @Column({ type: 'uuid', nullable: true })
  viewerUserId!: string | null;

  /**
   * User Agent - browser/device information
   */
  @Column({ type: 'text', nullable: true })
  userAgent!: string | null;

  /**
   * Referrer - where the view came from
   */
  @Column({ type: 'text', nullable: true })
  referrer!: string | null;
}

