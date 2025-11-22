import { Column, Entity, Index, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@database/database';
import { User } from '../../../../rest/api/users/assets/entities/user.entity';

/**
 * UserAnalytics Entity
 *
 * Stores aggregated analytics metrics for users.
 * These metrics are calculated from tracking data and interaction entities.
 */
@Entity('userAnalytics', { schema: 'data' })
@Index(['userId', 'dateUpdated'])
export class UserAnalytics extends BaseEntity {
  /**
   * User this analytics belongs to
   */
  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'uuid', unique: true })
  userId!: string;

  /**
   * Profile Views - calculated from ViewTrack where resourceType = 'profile'
   */
  @Column({ type: 'int', default: 0 })
  viewsCount!: number;

  /**
   * Followers Count - calculated from Follow entity
   */
  @Column({ type: 'int', default: 0 })
  followersCount!: number;

  /**
   * Following Count - calculated from Follow entity
   */
  @Column({ type: 'int', default: 0 })
  followingCount!: number;

  /**
   * Total Posts Count - calculated from Post entity
   */
  @Column({ type: 'int', default: 0 })
  postsCount!: number;

  /**
   * Total Videos Count - calculated from Video entity
   */
  @Column({ type: 'int', default: 0 })
  videosCount!: number;

  /**
   * Total Comments Count - calculated from Comment entity
   */
  @Column({ type: 'int', default: 0 })
  commentsCount!: number;

  /**
   * Total Likes Received - calculated from Like entity on user's posts
   */
  @Column({ type: 'int', default: 0 })
  likesReceivedCount!: number;

  /**
   * Total Shares Received - calculated from Share entity on user's posts
   */
  @Column({ type: 'int', default: 0 })
  sharesReceivedCount!: number;

  /**
   * Last time analytics were calculated/updated
   */
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastCalculatedAt!: Date;
}

