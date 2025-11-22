import { Column, Entity, Index, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@database/database';
import { Video } from '../../../../rest/api/users/services/videos/assets/entities/video.entity';

/**
 * VideoAnalytics Entity
 *
 * Stores aggregated analytics metrics for videos.
 * These metrics are calculated from tracking data and interaction entities.
 */
@Entity('videoAnalytics', { schema: 'data' })
@Index(['videoId', 'dateUpdated'])
export class VideoAnalytics extends BaseEntity {
  /**
   * Video this analytics belongs to
   */
  @OneToOne(() => Video, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'videoId' })
  video!: Video;

  @Column({ type: 'uuid', unique: true })
  videoId!: string;

  /**
   * Views Count - calculated from ViewTrack where resourceType = 'video'
   */
  @Column({ type: 'int', default: 0 })
  viewsCount!: number;

  /**
   * Likes Count - calculated from Like entity where resourceType = 'video'
   */
  @Column({ type: 'int', default: 0 })
  likesCount!: number;

  /**
   * Comments Count - calculated from Comment entity where resourceType = 'video'
   */
  @Column({ type: 'int', default: 0 })
  commentsCount!: number;

  /**
   * Shares Count - calculated from Share entity where resourceType = 'video'
   */
  @Column({ type: 'int', default: 0 })
  sharesCount!: number;

  /**
   * Total Watch Time - sum of all watch durations (in seconds)
   * This would be calculated from a future VideoWatch entity
   */
  @Column({ type: 'bigint', default: 0 })
  totalWatchTime!: number;

  /**
   * Average Watch Time - average watch duration per view (in seconds)
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  averageWatchTime!: number;

  /**
   * Completion Rate - percentage of views that watched to the end
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  completionRate!: number;

  /**
   * Last time analytics were calculated/updated
   */
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastCalculatedAt!: Date;
}

