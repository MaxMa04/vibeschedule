import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from '@vibeschedule/backend/api/routes/auth.controller';
import { UsersController } from '@vibeschedule/backend/api/routes/users.controller';
import { AuthMiddleware } from '@vibeschedule/backend/services/auth/auth.middleware';
import { AnalyticsController } from '@vibeschedule/backend/api/routes/analytics.controller';
import { IntegrationsController } from '@vibeschedule/backend/api/routes/integrations.controller';
import { SettingsController } from '@vibeschedule/backend/api/routes/settings.controller';
import { PostsController } from '@vibeschedule/backend/api/routes/posts.controller';
import { MediaController } from '@vibeschedule/backend/api/routes/media.controller';
import { RootController } from '@vibeschedule/backend/api/routes/root.controller';
import { AppsController } from '@vibeschedule/backend/api/routes/apps.controller';
import { FormatsController } from '@vibeschedule/backend/api/routes/formats.controller';
import { PfmWebhookController } from '@vibeschedule/backend/api/routes/pfm.webhook.controller';
import { ClippersController } from '@vibeschedule/backend/api/routes/clippers.controller';
import { ManualController } from '@vibeschedule/backend/api/routes/manual.controller';
import { ClipperGuard } from '@vibeschedule/backend/services/auth/clipper.guard';

const authenticatedControllers = [
  UsersController,
  AnalyticsController,
  IntegrationsController,
  AppsController,
  FormatsController,
  SettingsController,
  PostsController,
  MediaController,
  ManualController,
  ClippersController,
];

@Module({
  controllers: [
    RootController,
    AuthController,
    PfmWebhookController,
    ...authenticatedControllers,
  ],
  // clippers reach only what is marked with @AllowClipper()
  providers: [{ provide: APP_GUARD, useClass: ClipperGuard }],
})
export class ApiModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(...authenticatedControllers);
  }
}
