import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '@database/database';
import { Post } from './post.entity';
import { User } from '../../../../assets/entities/user.entity';

@Entity('postReport', { schema: 'social' })
@Unique(['userId', 'postId']) // Prevent duplicate reports at database level
@Index(['postId', 'dateCreated'])
@Index(['userId', 'dateCreated'])
@Index(['status', 'dateCreated'])
export class Report extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  reporter!: User;

  @Column({ nullable: false })
  userId!: string;

  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post!: Post;

  @Column({ nullable: false })
  postId!: string;

  @Column({
    type: 'enum',
    enum: [
      'spam',
      'harassment',
      'hate_speech',
      'violence',
      'copyright',
      'false_information',
      'inappropriate_content',
      'other',
    ],
    nullable: false,
  })
  reason!:
    | 'spam'
    | 'harassment'
    | 'hate_speech'
    | 'violence'
    | 'copyright'
    | 'false_information'
    | 'inappropriate_content'
    | 'other';

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    type: 'enum',
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
    default: 'pending',
  })
  status!: 'pending' | 'reviewed' | 'resolved' | 'dismissed';

  @Column({ type: 'varchar', length: 255, nullable: true })
  reviewedBy!: string | null; // Admin user ID who reviewed

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt!: Date | null;
}
