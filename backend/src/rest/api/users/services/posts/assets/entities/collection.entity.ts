import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '@database/database';
import { Post } from './post.entity';
import { User } from '../../../../assets/entities/user.entity';

@Entity('postCollection', { schema: 'social' })
@Index(['userId', 'dateCreated'])
@Index(['isPublic', 'dateCreated'])
@Index(['userId', 'isPublic']) // Composite index for user's public/private collections
export class Collection extends BaseEntity {
  @Column({ type: 'varchar', length: 200, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  coverImage: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: false })
  userId: string;

  @ManyToMany(() => Post, (post) => post.collections)
  posts: Post[];

  @Column({ type: 'int', default: 0 })
  postsCount: number;
}
