import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '@database/database';
import { User } from '../../../../rest/api/users/assets/entities/user.entity';

/**
 * Like Entity
 *
 * Universal like system that can be attached to any resource type
 * (posts, videos, comments, photos, articles, etc.)
 */
@Entity('socialLike', { schema: 'social' })
@Unique(['userId', 'resourceType', 'resourceId'])
@Index(['resourceType', 'resourceId', 'dateCreated'])
@Index(['userId', 'dateCreated'])
@Index(['userId', 'resourceType', 'resourceId']) // Composite index for user-resource lookups
export class Like extends BaseEntity {
  // #########################################################
  // Resource Reference (Universal)
  // #########################################################
  /**
   * Resource Type - what resource this like is on
   * e.g., 'post', 'video', 'comment', 'photo', 'article'
   */
  @Column({ type: 'varchar', length: 50 })
  resourceType!: string;

  /**
   * Resource ID - the ID of the resource this like is on
   */
  @Column({ type: 'uuid' })
  resourceId!: string;

  // #########################################################
  // Relationships
  // #########################################################
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ nullable: false })
  userId!: string;
}

