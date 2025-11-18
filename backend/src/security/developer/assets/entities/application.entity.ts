import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { BaseEntity } from '@database/database';
import { User } from '../../../../rest/api/users/assets/entities/user.entity';
import { ApplicationEnvironment } from '../enum/application-environment.enum';
import { ApplicationStatus } from '../enum/application-status.enum';

@Entity('application', { schema: 'developers' })
@Unique(['developerId', 'environment'])
@Index(['developerId'])
@Index(['clientId'])
@Index(['websocketId'])
@Index(['status'])
export class Application extends BaseEntity {
  @Column({ length: 255 })
  name!: string;

  @Column('text', { nullable: true })
  description!: string;

  @Column({
    type: 'enum',
    enum: ApplicationEnvironment,
    nullable: false,
  })
  environment!: ApplicationEnvironment;

  @Column({ unique: true, length: 255 })
  clientId!: string;

  @Column()
  clientSecret!: string; // Hashed

  @Column({ unique: true })
  websocketId!: string; // UUID, generated when app is created

  @Column('simple-array', { nullable: true })
  redirectUris!: string[];

  @Column({ nullable: true, length: 500 })
  iconUrl!: string;

  @Column({ nullable: true, length: 500 })
  websiteUrl!: string;

  @Column({ nullable: true, length: 500 })
  privacyPolicyUrl!: string;

  @Column({ nullable: true, length: 500 })
  termsOfServiceUrl!: string;

  @Column('simple-array', { default: [] })
  scopes!: string[];

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
  })
  status!: ApplicationStatus;

  @Column({ nullable: true })
  approvedAt!: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approvedById' })
  approvedBy!: User;

  @Column({ nullable: true })
  approvedById!: string;

  @Column({ default: 1000 })
  rateLimit!: number; // Requests per hour

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'developerId' })
  developer!: User;

  @Column()
  developerId!: string;

  @Column({ nullable: true })
  lastUsed!: Date;
}

