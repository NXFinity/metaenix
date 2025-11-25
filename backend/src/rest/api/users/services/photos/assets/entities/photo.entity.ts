import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@database/database';
import { User } from '../../../../assets/entities/user.entity';

@Entity('userPhoto', { schema: 'account' })
@Index(['userId', 'dateCreated'])
@Index(['userId', 'isPublic'])
@Index(['isPublic', 'dateCreated'])
@Index(['status', 'dateCreated'])
// Note: Unique constraint on slug is handled in application logic
// Partial unique index can be added via migration: CREATE UNIQUE INDEX ... WHERE slug IS NOT NULL
export class Photo extends BaseEntity {
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  slug!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: false })
  imageUrl!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnailUrl!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mimeType!: string | null;

  @Column({ type: 'bigint', default: 0 })
  fileSize!: number; // File size in bytes

  @Column({ type: 'int', default: 0 })
  width!: number; // Image width in pixels

  @Column({ type: 'int', default: 0 })
  height!: number; // Image height in pixels

  @Column({ type: 'varchar', length: 500, nullable: true })
  storageKey!: string | null; // Storage key for deletion

  @Column({ type: 'boolean', default: true })
  isPublic!: boolean;

  @Column({ type: 'varchar', length: 50, default: 'ready' })
  status!: string; // processing, ready, failed

  @Column({ type: 'int', default: 0 })
  viewsCount!: number; // Total views

  @Column({ type: 'simple-array', nullable: true, default: [] })
  tags!: string[]; // Tags for categorization

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null; // Additional metadata
}

