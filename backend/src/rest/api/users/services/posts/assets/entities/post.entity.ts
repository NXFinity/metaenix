import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
} from 'typeorm';
import { BaseEntity } from '@database/database';
import { Bookmark } from './bookmark.entity';
import { Report } from './report.entity';
import { Reaction } from './reaction.entity';
import { Collection } from './collection.entity';
import { User } from '../../../../assets/entities/user.entity';

@Entity('post', { schema: 'social' })
@Index(['userId', 'dateCreated'])
@Index(['isPublic', 'dateCreated'])
@Index(['userId', 'isPublic'])
@Index(['isDraft', 'dateCreated'])
@Index(['isArchived', 'dateCreated'])
@Index(['postType', 'dateCreated'])
@Index(['scheduledDate'])
// Note: GIN indexes for hashtags and mentions should be added via migration for efficient array search:
// CREATE INDEX idx_post_hashtags_gin ON account.userPost USING GIN (hashtags);
// CREATE INDEX idx_post_mentions_gin ON account.userPost USING GIN (mentions);
export class Post extends BaseEntity {
  // #########################################################
  // Post Content
  // #########################################################
  @Column({ type: 'text', nullable: false })
  content!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  mediaUrl!: string | null;

  @Column({ type: 'simple-array', nullable: true })
  mediaUrls!: string[];

  @Column({ type: 'varchar', length: 500, nullable: true })
  linkUrl!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  linkTitle!: string | null;

  @Column({ type: 'text', nullable: true })
  linkDescription!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  linkImage!: string | null;

  // #########################################################
  // Post Settings
  // #########################################################
  @Column({ type: 'boolean', default: true })
  isPublic!: boolean;

  @Column({ type: 'boolean', default: false })
  allowComments!: boolean;

  @Column({ type: 'boolean', default: false })
  isPinned!: boolean;

  @Column({ type: 'boolean', default: false })
  isEdited!: boolean;

  @Column({ type: 'boolean', default: false })
  isDraft!: boolean;

  @Column({ type: 'boolean', default: false })
  isArchived!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  scheduledDate!: Date | null;

  @Column({ type: 'simple-array', nullable: true, default: [] })
  hashtags!: string[];

  @Column({ type: 'simple-array', nullable: true, default: [] })
  mentions!: string[];

  @Column({ type: 'varchar', length: 50, nullable: true })
  postType!: 'text' | 'image' | 'video' | 'document' | 'mixed' | null;

  // #########################################################
  // Post Statistics
  // #########################################################
  @Column({ type: 'int', default: 0 })
  likesCount!: number;

  @Column({ type: 'int', default: 0 })
  commentsCount!: number;

  @Column({ type: 'int', default: 0 })
  sharesCount!: number;

  @Column({ type: 'int', default: 0 })
  viewsCount!: number;

  // #########################################################
  // Relationships
  // #########################################################
  @ManyToOne(() => User, (user) => user.posts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ nullable: false })
  userId!: string;

  // Post can be a reply to another post
  @ManyToOne(() => Post, (post) => post.replies, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parentPostId' })
  parentPost!: Post | null;

  @Column({ nullable: true })
  parentPostId!: string | null;

  @OneToMany(() => Post, (post) => post.parentPost, { cascade: true })
  replies!: Post[];

  // Note: Comments, Likes, and Shares are now handled by universal services
  // They use resourceType='post' and resourceId=post.id instead of direct foreign keys
  // Relationships are removed as they're no longer valid with the universal entities

  // Bookmarks of this post
  @OneToMany(() => Bookmark, (bookmark) => bookmark.post, { cascade: true })
  bookmarks!: Bookmark[];

  // Reports on this post
  @OneToMany(() => Report, (report) => report.post, { cascade: true })
  reports!: Report[];

  // Reactions on this post
  @OneToMany(() => Reaction, (reaction) => reaction.post, { cascade: true })
  reactions!: Reaction[];

  // Collections this post belongs to
  @ManyToMany(() => Collection, (collection) => collection.posts)
  collections!: Collection[];

  @Column({ type: 'int', default: 0 })
  bookmarksCount!: number;

  @Column({ type: 'int', default: 0 })
  reportsCount!: number;
}
