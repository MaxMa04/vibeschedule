import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PublicIntegrationsController } from '@vibeschedule/backend/public-api/routes/v1/public.integrations.controller';
import { PublicFormatsController } from '@vibeschedule/backend/public-api/routes/v1/public.formats.controller';
import { PublicAuthMiddleware } from '@vibeschedule/backend/services/auth/public.auth.middleware';

@Module({
  controllers: [PublicIntegrationsController, PublicFormatsController],
})
export class PublicApiModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(PublicAuthMiddleware)
      .forRoutes(PublicIntegrationsController, PublicFormatsController);
  }
}
