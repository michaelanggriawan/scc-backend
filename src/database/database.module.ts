import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { User } from '../entities/user.entity';
import { Room } from '../entities/room.entity';
import { AddOn } from '../entities/addon.entity';
import { Inquiry } from '../entities/inquiry.entity';
import { PaymentProof } from '../entities/payment-proof.entity';
import { PaymentLink } from '../entities/payment-link.entity';
import { Setting } from '../entities/setting.entity';

export const ALL_ENTITIES = [
  User,
  Room,
  AddOn,
  Inquiry,
  PaymentProof,
  PaymentLink,
  Setting,
];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const db = config.get('db');
        // sql.js (used for tests) is a pure-JS in-memory SQLite — no native
        // build, no local Postgres needed. The postgres connection fields
        // would be rejected by the driver, so branch here.
        if (db.type === 'sqljs') {
          return {
            type: 'sqljs',
            autoSave: false,
            location: 'scc-test',
            entities: ALL_ENTITIES,
            synchronize: true,
            autoLoadEntities: true,
          };
        }
        return {
          type: db.type,
          host: db.host,
          port: db.port,
          username: db.username,
          password: db.password,
          database: db.database,
          entities: ALL_ENTITIES,
          // Prefer migrations over synchronize outside of tests. When
          // DB_MIGRATIONS_RUN=true, pending migrations run automatically on
          // boot. Keep synchronize env-driven for local dev convenience.
          synchronize: db.synchronize,
          migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
          migrationsRun: db.migrationsRun,
          autoLoadEntities: true,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
