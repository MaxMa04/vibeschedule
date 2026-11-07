import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from '@vibeschedule/nestjs-libraries/database/prisma/database.module';
import { ApiModule } from '@vibeschedule/backend/api/api.module';
import { PublicApiModule } from '@vibeschedule/backend/public-api/public.api.module';
import { ThrottlerBehindProxyGuard } from '@vibeschedule/nestjs-libraries/throttler/throttler.provider';

@Module({
  imports: [
    DatabaseModule,
    ApiModule,
    PublicApiModule,
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 3600000, limit: 90 }],
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerBehindProxyGuard }],
})
export class AppModule {}
