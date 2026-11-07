import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PublicIntegrationsController } from '@vibeschedule/backend/public-api/routes/v1/public.integrations.controller';
import { PublicAuthMiddleware } from '@vibeschedule/backend/services/auth/public.auth.middleware';

@Module({
  controllers: [PublicIntegrationsController],
})
export class PublicApiModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(PublicAuthMiddleware)
      .forRoutes(PublicIntegrationsController);
  }
}
