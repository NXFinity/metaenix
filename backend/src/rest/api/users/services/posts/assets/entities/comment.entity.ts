import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '@database/database';
import { Post } from './post.entity';
import { Like } from './like.entity';
import { User } from 'src/rest/api/users/assets/entities/user.entity';

@Entity('postComment', { schema: 'social' })
@Index(['postId', 'dateCreated'])
@Index(['userId', 'dateCreated'])
@Index(['parentCommentId'])
export class Comment extends BaseEntity {
  // #########################################################
  // Comment Content
  // #########################################################
  @Column({ type: 'text', nullable: false })
  content: string;

  @Column({ type: 'boolean', default: false })
  isEdited: boolean;

  // #########################################################
  // Comment Statistics
  // #########################################################
  @Column({ type: 'int', default: 0 })
  likesCount: number;

  @Column({ type: 'int', default: 0 })
  repliesCount: number;

  // #########################################################
  // Relationships
  // #########################################################
  @ManyToOne(() => Post, (post) => post.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post;

  @Column({ nullable: false })
  postId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: false })
  userId: string;

  // Comment can be a reply to another comment
  @ManyToOne(() => Comment, (comment) => comment.replies, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parentCommentId' })
  parentComment: Comment | null;

  @Column({ nullable: true })
  parentCommentId: string | null;

  @OneToMany(() => Comment, (comment) => comment.parentComment, {
    cascade: true,
  })
  replies: Comment[];

  // Likes on this comment
  @OneToMany(() => Like, (like) => like.comment, { cascade: true })
  likes: Like[];
}
