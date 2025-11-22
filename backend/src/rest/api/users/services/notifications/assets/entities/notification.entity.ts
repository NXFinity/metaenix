import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@database/database';
import { User } from '../../../../assets/entities/user.entity';
import { NotificationType } from '../enum/notification-type.enum';

@Entity('notification', { schema: 'account' })
@Index(['userId', 'dateCreated'])
@Index(['userId', 'isRead'])
@Index(['userId', 'isRead', 'dateCreated'])
@Index(['type', 'dateCreated'])
export class Notification extends BaseEntity {
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'enum', enum: NotificationType })
  type!: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  relatedUserId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  relatedPostId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  relatedCommentId!: string | null;

  @Column({ type: 'boolean', default: false })
  isRead!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  readAt!: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  actionUrl!: string | null;
}

