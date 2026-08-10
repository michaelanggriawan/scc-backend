import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationPrefs,
  PaymentInfo,
  Setting,
  SETTING_KEYS,
  VenueInfo,
} from '../../entities/setting.entity';

const DEFAULT_VENUE: VenueInfo = {
  name: '',
  address: '',
  phone: '',
  email: '',
  whatsapp: '',
  instagram: '',
  facebook: '',
  linkedin: '',
  youtube: '',
  mapEmbedUrl: '',
};

const DEFAULT_PAYMENT: PaymentInfo = {
  bankName: '',
  accountNumber: '',
  accountName: '',
  qrImageUrl: null,
  instructions: '',
};

const DEFAULT_NOTIFS: NotificationPrefs = {
  newInquiry: true,
  paymentSubmitted: true,
  linkExpiringSoon: false,
  dailySummary: false,
};

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private readonly repo: Repository<Setting>,
  ) {}

  private async get<T>(key: string, fallback: T): Promise<T> {
    const row = await this.repo.findOne({ where: { key } });
    return row ? ({ ...fallback, ...row.value } as T) : fallback;
  }

  private async set<T extends Record<string, any>>(
    key: string,
    value: T,
  ): Promise<T> {
    await this.repo.save({ key, value });
    return value;
  }

  getVenueInfo(): Promise<VenueInfo> {
    return this.get(SETTING_KEYS.venue, DEFAULT_VENUE);
  }
  saveVenueInfo(value: VenueInfo): Promise<VenueInfo> {
    return this.set(SETTING_KEYS.venue, value);
  }

  getPaymentInfo(): Promise<PaymentInfo> {
    return this.get(SETTING_KEYS.payment, DEFAULT_PAYMENT);
  }
  savePaymentInfo(value: PaymentInfo): Promise<PaymentInfo> {
    return this.set(SETTING_KEYS.payment, value);
  }

  getNotificationPrefs(): Promise<NotificationPrefs> {
    return this.get(SETTING_KEYS.notifications, DEFAULT_NOTIFS);
  }
  saveNotificationPrefs(value: NotificationPrefs): Promise<NotificationPrefs> {
    return this.set(SETTING_KEYS.notifications, value);
  }
}
