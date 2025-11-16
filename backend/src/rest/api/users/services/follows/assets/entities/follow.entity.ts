import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '@database/database';
import { User } from '../../../../assets/entities/user.entity';

@Entity('userFollow', { schema: 'account' })
@Unique(['followerId', 'followingId']) // Ensure a user can only follow another user once
@Index(['followerId', 'dateCreated'])
@Index(['followingId', 'dateCreated'])
export class Follow extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'followerId' })
  follower: User;

  @Column({ nullable: false })
  followerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'followingId' })
  following: User;

  @Column({ nullable: false })
  followingId: string;
}
