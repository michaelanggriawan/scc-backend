import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Inquiry } from './inquiry.entity';
import { TIMESTAMP_TYPE } from '../common/db-types';

// A tokenized, no-login link to the pay page. Generated when admin marks an
// inquiry "Awaiting Payment". Deactivated once used, expired, or the booking
// is cancelled/confirmed.
@Entity('payment_links')
export class PaymentLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  token: string;

  @ManyToOne(() => Inquiry, (inquiry) => inquiry.paymentLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inquiryId' })
  inquiry: Inquiry;

  @Column({ type: 'uuid' })
  inquiryId: string;

  @Column({ type: TIMESTAMP_TYPE, nullable: true })
  expiresAt: Date | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
