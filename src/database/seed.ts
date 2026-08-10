import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';
import { RoomsService } from '../modules/rooms/rooms.service';
import { AddOnsService } from '../modules/addons/addons.service';
import { SettingsService } from '../modules/settings/settings.service';
import { InquiriesService } from '../modules/inquiries/inquiries.service';
import { EntityStatus, SPEC_SYSTEMS, UserRole } from '../common/enums';

async function seed() {
  const logger = new Logger('Seed');
  const app = await NestFactory.createApplicationContext(AppModule);

  const config = app.get(ConfigService);
  const users = app.get(UsersService);
  const rooms = app.get(RoomsService);
  const addons = app.get(AddOnsService);
  const settings = app.get(SettingsService);
  const inquiries = app.get(InquiriesService);

  // ─── Admin user ────────────────────────────────────
  const adminEmail = config.get<string>('seed.adminEmail')!;
  const adminPassword = config.get<string>('seed.adminPassword')!;
  if (!(await users.findByEmail(adminEmail))) {
    await users.create({
      email: adminEmail,
      password: adminPassword,
      fullName: 'SCC Admin',
      role: UserRole.Admin,
    });
    logger.log(`Created admin: ${adminEmail} / ${adminPassword}`);
  } else {
    logger.log(`Admin already exists: ${adminEmail}`);
  }

  // ─── Rooms ─────────────────────────────────────────
  const existingRooms = await rooms.findAll();
  if (existingRooms.length === 0) {
    await rooms.create({
      name: 'Grand Hall',
      capacity: '2000 pax',
      area: '1800 m²',
      status: EntityStatus.Active,
      description: 'Flagship hall with full built-in production systems.',
      facilities: ['LED Wall', 'Line Array Sound', 'Rigging Points', 'VIP Green Room'],
      specs: SPEC_SYSTEMS.map((system) => ({ system, spec: 'Built-in' })),
      photos: [],
      floorPlans: [],
    } as any);
    await rooms.create({
      name: 'Function Room A',
      capacity: '400 pax',
      area: '350 m²',
      status: EntityStatus.Active,
      description: 'Mid-size room for seminars and social events.',
      facilities: ['Projector', 'PA System', 'WiFi'],
      specs: SPEC_SYSTEMS.map((system) => ({ system, spec: '' })),
      photos: [],
      floorPlans: [],
    } as any);
    logger.log('Seeded 2 rooms');
  }

  // ─── Add-ons ───────────────────────────────────────
  const existingAddons = await addons.findAll();
  if (existingAddons.length === 0) {
    await addons.create({
      name: '14 × 3m LED Screen Wall',
      description: 'P2.5 high-density system incl. Novastar processing and technician.',
      status: EntityStatus.Active,
    } as any);
    await addons.create({
      name: 'ZSOUND Line Array Audio',
      description: 'Full line array (14,000W), Behringer Wing console, 2 operators.',
      status: EntityStatus.Active,
    } as any);
    await addons.create({
      name: 'Stage Lighting Systems',
      description: 'PAR LEDs, Fresnel spots, moving beams, hazer, 1 tech operator.',
      status: EntityStatus.Active,
    } as any);
    logger.log('Seeded 3 add-ons');
  }

  // ─── Settings ──────────────────────────────────────
  await settings.saveVenueInfo({
    name: 'SCC Convention Center',
    address: 'Jl. Contoh No. 1, Jakarta',
    phone: '+62 21 0000 0000',
    email: adminEmail,
    whatsapp: '+62 811 0000 0000',
    instagram: '@scc',
    facebook: '',
    linkedin: '',
    youtube: '',
    mapEmbedUrl: '',
  });
  await settings.savePaymentInfo({
    bankName: 'BCA',
    accountNumber: '1234567890',
    accountName: 'PT SCC Venue',
    qrImageUrl: null,
    instructions: 'Transfer the exact amount, then upload your proof of payment.',
  });
  logger.log('Seeded venue + payment settings');

  // ─── A sample inquiry ──────────────────────────────
  const allRooms = await rooms.findAll();
  const existingInquiries = await inquiries.adminList({ page: 1, limit: 1 } as any);
  if (existingInquiries.total === 0 && allRooms.length) {
    await inquiries.create({
      customerName: 'Budi Santoso',
      customerEmail: 'budi@example.com',
      customerPhone: '+62 812 3456 7890',
      roomId: allRooms[0].id,
      addonIds: [],
      date: '2026-12-05',
      time: '09:00',
      duration: '10 hours',
      category: 'Corporate Conference / Seminar',
      notes: 'Need extra parking for 200 cars.',
    } as any);
    logger.log('Seeded 1 sample inquiry');
  }

  await app.close();
  logger.log('Seed complete.');
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
