import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@database/database';
import { User } from '../../../users/assets/entities/user.entity';
import { NotificationType } from '../enum/notification-type.enum';

@Entity('notification', { schema: 'account' })
@Index(['userId', 'dateCreated'])
@Index(['userId', 'isRead'])
@Index(['userId', 'isRead', 'dateCreated'])
@Index(['type', 'dateCreated'])
export class Notification extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ nullable: false })
  userId!: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    nullable: false,
  })
  type!: NotificationType;

  @Column({ type: 'varchar', length: 255, nullable: false })
  title!: string;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  // Related entity IDs (for linking to posts, comments, users, etc.)
  @Column({ type: 'varchar', length: 255, nullable: true })
  relatedUserId!: string | null; // User who triggered the notification (e.g., follower, liker)

  @Column({ type: 'varchar', length: 255, nullable: true })
  relatedPostId!: string | null; // Post related to the notification

  @Column({ type: 'varchar', length: 255, nullable: true })
  relatedCommentId!: string | null; // Comment related to the notification

  @Column({ type: 'boolean', default: false })
  isRead!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt!: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  actionUrl!: string | null; // URL to navigate to when notification is clicked
}

