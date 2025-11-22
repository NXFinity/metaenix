import { Column, Entity, Index, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@database/database';
import { Post } from '../../../../rest/api/users/services/posts/assets/entities/post.entity';

/**
 * PostAnalytics Entity
 *
 * Stores aggregated analytics metrics for posts.
 * These metrics are calculated from tracking data and interaction entities.
 */
@Entity('postAnalytics', { schema: 'data' })
@Index(['postId', 'dateUpdated'])
export class PostAnalytics extends BaseEntity {
  /**
   * Post this analytics belongs to
   */
  @OneToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post!: Post;

  @Column({ type: 'uuid', unique: true })
  postId!: string;

  /**
   * Views Count - calculated from ViewTrack where resourceType = 'post'
   */
  @Column({ type: 'int', default: 0 })
  viewsCount!: number;

  /**
   * Likes Count - calculated from Like entity
   */
  @Column({ type: 'int', default: 0 })
  likesCount!: number;

  /**
   * Comments Count - calculated from Comment entity
   */
  @Column({ type: 'int', default: 0 })
  commentsCount!: number;

  /**
   * Shares Count - calculated from Share entity
   */
  @Column({ type: 'int', default: 0 })
  sharesCount!: number;

  /**
   * Bookmarks Count - calculated from Bookmark entity
   */
  @Column({ type: 'int', default: 0 })
  bookmarksCount!: number;

  /**
   * Reports Count - calculated from Report entity
   */
  @Column({ type: 'int', default: 0 })
  reportsCount!: number;

  /**
   * Reactions Count - calculated from Reaction entity
   */
  @Column({ type: 'int', default: 0 })
  reactionsCount!: number;

  /**
   * Engagement Rate - calculated as (likes + comments + shares) / views * 100
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  engagementRate!: number;

  /**
   * Total Engagements - sum of likes, comments, shares, reactions
   */
  @Column({ type: 'int', default: 0 })
  totalEngagements!: number;

  /**
   * Last time analytics were calculated/updated
   */
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastCalculatedAt!: Date;
}

