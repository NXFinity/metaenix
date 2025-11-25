import { Column, Entity, Index, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@database/database';
import { Photo } from '../../../../rest/api/users/services/photos/assets/entities/photo.entity';

/**
 * PhotoAnalytics Entity
 *
 * Stores aggregated analytics metrics for individual photos.
 * These metrics are calculated from tracking data and interaction entities.
 */
@Entity('photoAnalytics', { schema: 'data' })
@Index(['photoId', 'dateUpdated'])
export class PhotoAnalytics extends BaseEntity {
  /**
   * Photo this analytics belongs to
   */
  @OneToOne(() => Photo, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'photoId' })
  photo!: Photo;

  @Column({ type: 'uuid', unique: true })
  photoId!: string;

  /**
   * Total Views - calculated from ViewTrack where resourceType = 'photo'
   */
  @Column({ type: 'int', default: 0 })
  viewsCount!: number;

  /**
   * Total Likes - calculated from Like entity
   */
  @Column({ type: 'int', default: 0 })
  likesCount!: number;

  /**
   * Total Comments - calculated from Comment entity
   */
  @Column({ type: 'int', default: 0 })
  commentsCount!: number;

  /**
   * Total Shares - calculated from Share entity
   */
  @Column({ type: 'int', default: 0 })
  sharesCount!: number;

  /**
   * Last time analytics were calculated/updated
   */
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastCalculatedAt!: Date;
}

