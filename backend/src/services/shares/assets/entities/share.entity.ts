import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '@database/database';
import { User } from '../../../../rest/api/users/assets/entities/user.entity';

/**
 * Share Entity
 *
 * Universal share system that can be attached to any resource type
 * (posts, videos, photos, articles, etc.)
 */
@Entity('socialShare', { schema: 'social' })
@Unique(['userId', 'resourceType', 'resourceId'])
@Index(['resourceType', 'resourceId', 'dateCreated'])
@Index(['userId', 'dateCreated'])
@Index(['userId', 'resourceType', 'resourceId']) // Composite index for user-resource lookups
export class Share extends BaseEntity {
  // #########################################################
  // Share Content
  // #########################################################
  /**
   * Optional comment when sharing
   */
  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  // #########################################################
  // Resource Reference (Universal)
  // #########################################################
  /**
   * Resource Type - what resource this share is on
   * e.g., 'post', 'video', 'photo', 'article'
   */
  @Column({ type: 'varchar', length: 50 })
  resourceType!: string;

  /**
   * Resource ID - the ID of the resource this share is on
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

