import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '@database/database';
import { User } from './user.entity';
import { DEFAULT_PROFILE_IMAGES } from 'src/common/constants/app.constants';

@Entity('userProfile', { schema: 'account' })
export class Profile extends BaseEntity {
  @Column({ length: 50, nullable: true })
  firstName: string;
  @Column({ length: 50, nullable: true })
  lastName: string;
  @Column({ length: 500, nullable: true })
  bio: string;
  @Column({ length: 50, nullable: true })
  location: string;
  @Column({ length: 50, nullable: true })
  website: string;
  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({
    type: 'varchar',
    default: DEFAULT_PROFILE_IMAGES.AVATAR,
  })
  avatar: string;
  @Column({
    type: 'varchar',
    default: DEFAULT_PROFILE_IMAGES.COVER,
  })
  cover: string;
  @Column({
    type: 'varchar',
    default: DEFAULT_PROFILE_IMAGES.BANNER,
  })
  banner: string;
  @Column({
    type: 'varchar',
    default: DEFAULT_PROFILE_IMAGES.OFFLINE,
  })
  offline: string;
  @Column({ type: 'varchar', nullable: true })
  chat: string;

  @OneToOne(() => User, (user) => user.profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profileId' })
  user: User;
}
