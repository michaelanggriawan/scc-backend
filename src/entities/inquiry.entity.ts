import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InquiryStatus } from '../common/enums';
import { User } from './user.entity';
import { PaymentProof } from './payment-proof.entity';
import { PaymentLink } from './payment-link.entity';

@Entity('inquiries')
export class Inquiry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Human-facing reference, e.g. SCC-2026-0041
  @Index({ unique: true })
  @Column()
  ref: string;

  // Snapshot of the customer name at submission (guests have no account)
  @Column({ default: '' })
  customerName: string;

  @Column({ default: '' })
  customerEmail: string;

  @Column({ default: '' })
  customerPhone: string;

  // Nullable: guests can submit without an account
  @ManyToOne(() => User, (user) => user.inquiries, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customerId' })
  customer: User | null;

  @Column({ type: 'uuid', nullable: true })
  customerId: string | null;

  @Column({ type: 'uuid', nullable: true })
  roomId: string | null;

  // string[] of AddOn ids
  @Column({ type: 'simple-json', nullable: true })
  addonIds: string[];

  @Column({ default: '' })
  date: string; // requested event date (YYYY-MM-DD)

  @Column({ default: '' })
  time: string; // start time HH:MM

  @Column({ default: '' })
  duration: string; // e.g. "8 hours"

  @Column({ default: '' })
  category: string;

  @Column({ type: 'text', default: '' })
  notes: string;

  @Column({ type: 'varchar', default: InquiryStatus.NewInquiry })
  status: InquiryStatus;

  // Agreed price in IDR (set by admin). Null until negotiated.
  // bigint keeps room for large rupiah amounts; transformer normalises the
  // pg driver's string return back to a JS number.
  @Column({
    type: 'bigint',
    nullable: true,
    transformer: {
      to: (v: number | null) => v,
      from: (v: string | number | null) => (v == null ? null : Number(v)),
    },
  })
  agreedPrice: number | null;

  @Column({ type: 'varchar', nullable: true })
  paymentDueDate: string | null; // YYYY-MM-DD

  @Column({ type: 'text', default: '' })
  adminNotes: string;

  @Column({ type: 'text', default: '' })
  rejectionReason: string;

  @Column({ type: 'int', default: 0 })
  rejectionCount: number;

  @Column({ type: 'varchar', nullable: true })
  cancelledBy: string | null; // Customer | Admin | System

  @Column({ type: 'text', default: '' })
  cancelReason: string;

  @OneToMany(() => PaymentProof, (proof) => proof.inquiry)
  proofs: PaymentProof[];

  @OneToMany(() => PaymentLink, (link) => link.inquiry)
  paymentLinks: PaymentLink[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
