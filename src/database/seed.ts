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
    // Every value below is traceable to the pitch deck (SCC TECH PITCH DECK.md).
    // The deck describes exactly one hall — do not add further rooms without a source.
    const specValues: Record<string, string> = {
      'LED Display': 'P2.5 indoor LED wall, 14m × 3m',
      'Sound System': 'ZSOUND LA210 line array + S218B subwoofer on a Behringer Wing digital console',
      Rigging: '8m clear height, ideal for high stage rigging installation',
      Lighting:
        'Two rentable tiers: Compact/Meeting (LED Par + Fresnel, up to 100 pax) or Ballroom/Corporate (LED Par + Fresnel + Moving Head Beam + Hazer, up to 250 pax) — see Lighting add-ons',
      'Power Supply': 'Large-scale integrated power system, ready for concerts & multimedia',
      Connectivity: 'Integrated HDMI input system (via Novastar VX1000 video processor)',
      'IMAG / Projection': 'Media server: Intel Core i7-14700 with NVIDIA GeForce RTX 5070 Ti for lag-free video mapping',
      Communication: 'On-site technician standing by throughout the event',
    };
    await rooms.create({
      name: 'Grand Venue',
      capacity: '500–1,000+ pax',
      area: '42m × 24m',
      status: EntityStatus.Active,
      description:
        'Premium international-scale venue designed for major events, national conventions, corporate gatherings, and spectacular concerts. Pillar-free convention room.',
      facilities: [
        '42m × 24m Pillar-Free Floor',
        'P2.5 LED Wall (14m × 3m)',
        'ZSOUND Line Array Sound System',
        'Direct Loading Dock Access',
      ],
      specs: SPEC_SYSTEMS.map((system) => ({ system, spec: specValues[system] ?? '' })),
      photos: [],
      floorPlans: [],
    } as any);
    logger.log('Seeded 1 room');
  }

  // ─── Add-ons ───────────────────────────────────────
  const existingAddons = await addons.findAll();
  if (existingAddons.length === 0) {
    await addons.create({
      name: 'P2.5 LED Wall (14m × 3m)',
      description:
        'Novastar VX1000 video processor, Intel Core i7-14700 / RTX 5070 Ti media server, delivery, installation, cabling, and a standby technician. Starting from Rp 20,000,000.',
      status: EntityStatus.Active,
    } as any);
    await addons.create({
      name: 'Audio – Ballroom / Corporate (up to 300 pax)',
      description:
        '2 Mackie Thump ground-stack speakers, 2 subwoofers, 2 floor monitors, Wing rack mixer, 4 wireless mics, ±5,000W, 1 audio operator + 1 stage crew. Rp 6,000,000 / 8 hours.',
      status: EntityStatus.Active,
    } as any);
    await addons.create({
      name: 'Audio – Concert / Grand Wedding (500–1,000 pax)',
      description:
        'Full ZSOUND line array (8-box, flown), 2 subwoofers, 4 floor monitors, Behringer Wing + S32 stagebox, 6 wireless mics with antenna distributor, 14,000W, 1 audio operator + 2 stage crew. Rp 12,000,000 / 8 hours.',
      status: EntityStatus.Active,
    } as any);
    await addons.create({
      name: 'Lighting – Compact / Meeting (up to 100 pax)',
      description:
        '4 LED Par (color wash), 2 Fresnel face lights, 1 controller system, ±2,000W, 1 operator. Rp 3,000,000.',
      status: EntityStatus.Active,
    } as any);
    await addons.create({
      name: 'Lighting – Ballroom / Corporate (up to 250 pax)',
      description:
        '8 LED Par, 4 Fresnel, 4 moving head beams, 1 hazer machine, 1 controller console, ±7,500W, 1 operator + 1 stage crew. Rp 6,500,000.',
      status: EntityStatus.Active,
    } as any);
    logger.log('Seeded 5 add-ons');
  }

  // ─── Settings ──────────────────────────────────────
  await settings.saveVenueInfo({
    name: 'Serpong Convention Center',
    address:
      'Jl. MH. Thamrin No. KM 2 Lantai P5, RT.007/RW.001, Panunggangan Utara, Kec. Pinang, Kota Tangerang, Banten 15143',
    phone: '0815-97-997-17',
    email: adminEmail,
    whatsapp: '0815-97-997-17',
    // The deck lists no social media handles — left blank rather than guessed.
    instagram: '',
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
