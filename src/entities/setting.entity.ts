import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

// Key/value singleton store for admin Settings sections:
//   'venue'          -> VenueInfo
//   'payment'        -> PaymentInfo (bank, account, QR)
//   'notifications'  -> NotificationPrefs
// Keeps settings flexible without a migration per new field.
@Entity('settings')
export class Setting {
  @PrimaryColumn()
  key: string;

  @Column({ type: 'simple-json', nullable: true })
  value: Record<string, any>;

  @UpdateDateColumn()
  updatedAt: Date;
}

export interface VenueInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  whatsapp: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  youtube?: string;
  mapEmbedUrl?: string;
}

export interface PaymentInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
  qrImageUrl: string | null;
  instructions: string;
}

export interface NotificationPrefs {
  newInquiry: boolean;
  paymentSubmitted: boolean;
  linkExpiringSoon: boolean;
  dailySummary: boolean;
}

export const SETTING_KEYS = {
  venue: 'venue',
  payment: 'payment',
  notifications: 'notifications',
} as const;
