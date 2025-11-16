import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@database/database';
import { Post } from './post.entity';
import { User } from '../../../../assets/entities/user.entity';

@Entity('postShare', { schema: 'social' })
@Index(['postId', 'dateCreated'])
@Index(['userId', 'dateCreated'])
@Index(['userId', 'postId']) // Composite index for user-post lookups (prevents duplicate shares check)
export class Share extends BaseEntity {
  // #########################################################
  // Share Content
  // #########################################################
  @Column({ type: 'text', nullable: true })
  comment: string | null;

  // #########################################################
  // Relationships
  // #########################################################
  @ManyToOne(() => Post, (post) => post.shares, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post;

  @Column({ nullable: false })
  postId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: false })
  userId: string;
}
