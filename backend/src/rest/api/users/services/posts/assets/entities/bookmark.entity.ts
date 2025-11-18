import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '@database/database';
import { Post } from './post.entity';
import { User } from '../../../../assets/entities/user.entity';

@Entity('postBookmark', { schema: 'social' })
@Unique(['userId', 'postId'])
@Index(['userId', 'dateCreated'])
@Index(['postId', 'dateCreated'])
@Index(['userId', 'postId']) // Composite index for user-post lookups (already unique, but helps query performance)
export class Bookmark extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ nullable: false })
  userId!: string;

  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post!: Post;

  @Column({ nullable: false })
  postId!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  note!: string | null; // Optional note about why bookmarked
}
