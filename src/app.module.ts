import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CargosModule } from './cargos/cargos.module';
import { ChatModule } from './chat/chat.module';
import { configuration } from './config/configuration';
import { DocumentsModule } from './documents/documents.module';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { LocationsModule } from './locations/locations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OffersModule } from './offers/offers.module';
import { PrismaModule } from './prisma/prisma.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('throttle.ttlSeconds', 60) * 1000,
          limit: config.get<number>('throttle.limit', 120),
        },
      ],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    LocationsModule,
    CargosModule,
    VehiclesModule,
    DocumentsModule,
    OffersModule,
    ChatModule,
    NotificationsModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
