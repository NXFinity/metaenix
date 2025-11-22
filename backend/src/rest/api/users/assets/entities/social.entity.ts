import { BaseEntity } from "@database/database";
import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { User } from './user.entity';

@Entity('userSocial', { schema: 'account' })
export class Social extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: true })
  twitter!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  instagram!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  facebook!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  github!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  linkedin!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  youtube!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  tiktok!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  discord!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  twitch!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  snapchat!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  pinterest!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reddit!: string | null;

  @OneToOne(() => User, (user) => user.social, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'socialId' })
  user!: User;
}
