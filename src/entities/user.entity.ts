import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../common/enums';
import { Inquiry } from './inquiry.entity';
import { TIMESTAMP_TYPE } from '../common/db-types';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  email: string;

  @Column()
  passwordHash: string;

  @Column({ default: '' })
  fullName: string;

  @Column({ default: '' })
  phone: string;

  @Column({ default: '' })
  company: string;

  @Column({ type: 'varchar', default: UserRole.Customer })
  role: UserRole;

  // Used for "Last changed" on the profile password card
  @Column({ type: TIMESTAMP_TYPE, nullable: true })
  passwordChangedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  resetToken: string | null;

  @Column({ type: TIMESTAMP_TYPE, nullable: true })
  resetTokenExpiresAt: Date | null;

  @OneToMany(() => Inquiry, (inquiry) => inquiry.customer)
  inquiries: Inquiry[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
