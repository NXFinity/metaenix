import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '@database/database';
import { User } from '../user.entity';

@Entity('userPrivacy', { schema: 'account' })
export class Privacy extends BaseEntity {
  @Column({ type: 'boolean', default: false })
  isFollowerOnly: boolean;
  @Column({ type: 'boolean', default: false })
  isSubscriberOnly: boolean;
  @Column({ type: 'boolean', default: false })
  isMatureContent: boolean;

  @Column({ type: 'boolean', default: false })
  allowMessages: boolean;
  @Column({ type: 'boolean', default: true })
  allowNotifications: boolean;
  @Column({ type: 'boolean', default: false })
  allowFriendRequests: boolean;
  @Column({ type: 'boolean', default: true })
  notifyOnFollow: boolean;

  @OneToOne(() => User, (user) => user.privacy, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'privacyId' })
  user: User;
}
