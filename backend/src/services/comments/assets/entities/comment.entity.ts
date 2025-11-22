import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '@database/database';
import { User } from '../../../../rest/api/users/assets/entities/user.entity';

/**
 * Comment Entity
 *
 * Universal comment system that can be attached to any resource type
 * (posts, videos, photos, articles, etc.)
 */
@Entity('socialComment', { schema: 'social' })
@Index(['resourceType', 'resourceId', 'dateCreated'])
@Index(['userId', 'dateCreated'])
@Index(['parentCommentId'])
@Index(['resourceType', 'resourceId', 'parentCommentId'])
export class Comment extends BaseEntity {
  // #########################################################
  // Comment Content
  // #########################################################
  @Column({ type: 'text', nullable: false })
  content!: string;

  @Column({ type: 'boolean', default: false })
  isEdited!: boolean;

  // #########################################################
  // Resource Reference (Universal)
  // #########################################################
  /**
   * Resource Type - what resource this comment is on
   * e.g., 'post', 'video', 'photo', 'article'
   */
  @Column({ type: 'varchar', length: 50 })
  resourceType!: string;

  /**
   * Resource ID - the ID of the resource this comment is on
   */
  @Column({ type: 'uuid' })
  resourceId!: string;

  // #########################################################
  // Comment Statistics
  // #########################################################
  @Column({ type: 'int', default: 0 })
  likesCount!: number;

  @Column({ type: 'int', default: 0 })
  repliesCount!: number;

  // #########################################################
  // Relationships
  // #########################################################
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ nullable: false })
  userId!: string;

  // Comment can be a reply to another comment
  @ManyToOne(() => Comment, (comment) => comment.replies, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parentCommentId' })
  parentComment!: Comment | null;

  @Column({ nullable: true })
  parentCommentId!: string | null;

  @OneToMany(() => Comment, (comment) => comment.parentComment, {
    cascade: true,
  })
  replies!: Comment[];
}

