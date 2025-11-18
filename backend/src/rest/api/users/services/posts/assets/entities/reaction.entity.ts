import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '@database/database';
import { Post } from './post.entity';
import { Comment } from './comment.entity';
import { User } from '../../../../assets/entities/user.entity';

@Entity('postReaction', { schema: 'social' })
@Unique(['userId', 'postId', 'commentId'])
@Index(['userId', 'postId'])
@Index(['userId', 'commentId'])
@Index(['postId', 'reactionType'])
@Index(['commentId', 'reactionType'])
export class Reaction extends BaseEntity {
  @Column({
    type: 'enum',
    enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry'],
    nullable: false,
  })
  reactionType!: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ nullable: false })
  userId!: string;

  @ManyToOne(() => Post, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'postId' })
  post!: Post | null;

  @Column({ nullable: true })
  postId!: string | null;

  @ManyToOne(() => Comment, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'commentId' })
  comment!: Comment | null;

  @Column({ nullable: true })
  commentId!: string | null;
}
