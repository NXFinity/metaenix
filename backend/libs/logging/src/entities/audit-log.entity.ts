import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@database/database/base/base.entity';
import { LogLevel } from '../enums/log-level.enum';
import { LogCategory } from '../enums/log-category.enum';

@Entity('auditLog', { schema: 'logging' })
@Index(['userId', 'dateCreated'])
@Index(['category', 'level', 'dateCreated'])
@Index(['level', 'dateCreated'])
export class AuditLog extends BaseEntity {
  @Column({ type: 'enum', enum: LogLevel })
  level: LogLevel;

  @Column({ type: 'enum', enum: LogCategory })
  category: LogCategory;

  @Column({ type: 'varchar', length: 255 })
  message: string;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  username: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  ipAddress: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  requestId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  endpoint: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  method: string | null;

  @Column({ type: 'int', nullable: true })
  statusCode: number | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  error: {
    name?: string;
    message?: string;
    stack?: string;
    code?: string;
  } | null;
}
