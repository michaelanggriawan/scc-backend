import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Inquiry } from './inquiry.entity';

// One row per proof-of-payment upload. A rejected payment keeps its row for
// history; the next upload adds another row.
@Entity('payment_proofs')
export class PaymentProof {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Inquiry, (inquiry) => inquiry.proofs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inquiryId' })
  inquiry: Inquiry;

  @Column({ type: 'uuid' })
  inquiryId: string;

  @Column()
  fileUrl: string;

  @Column({ default: '' })
  fileName: string;

  @Column({ type: 'int', default: 0 })
  fileSize: number;

  @Column({ default: '' })
  mimeType: string;

  @CreateDateColumn()
  submittedAt: Date;
}
