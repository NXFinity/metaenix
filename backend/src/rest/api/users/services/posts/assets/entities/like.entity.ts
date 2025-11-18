import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '@database/database';
import { Post } from './post.entity';
import { Comment } from './comment.entity';
import { User } from 'src/rest/api/users/assets/entities/user.entity';

@Entity('postLike', { schema: 'social' })
@Unique(['userId', 'postId'])
@Unique(['userId', 'commentId'])
@Index(['postId', 'dateCreated'])
@Index(['commentId', 'dateCreated'])
@Index(['userId'])
@Index(['userId', 'postId']) // Composite index for user-post lookups
@Index(['userId', 'commentId']) // Composite index for user-comment lookups
export class Like extends BaseEntity {
  // #########################################################
  // Like Type
  // #########################################################
  @Column({ type: 'enum', enum: ['post', 'comment'], nullable: false })
  likeType!: 'post' | 'comment';

  // #########################################################
  // Relationships
  // #########################################################
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ nullable: false })
  userId!: string;

  @ManyToOne(() => Post, (post) => post.likes, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'postId' })
  post!: Post | null;

  @Column({ nullable: true })
  postId!: string | null;

  @ManyToOne(() => Comment, (comment) => comment.likes, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'commentId' })
  comment!: Comment | null;

  @Column({ nullable: true })
  commentId!: string | null;
}
