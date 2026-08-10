import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { EmailModule } from './modules/email/email.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { AddOnsModule } from './modules/addons/addons.module';
import { SettingsModule } from './modules/settings/settings.module';
import { InquiriesModule } from './modules/inquiries/inquiries.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    EmailModule,
    UploadsModule,
    AuthModule,
    UsersModule,
    RoomsModule,
    AddOnsModule,
    SettingsModule,
    InquiriesModule,
    PaymentsModule,
    DashboardModule,
    TasksModule,
  ],
  providers: [
    // Global Zod validation for every DTO
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    // Auth first (populates request.user), then role check
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
