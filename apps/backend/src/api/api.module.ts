import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthController } from '@vibeschedule/backend/api/routes/auth.controller';
import { UsersController } from '@vibeschedule/backend/api/routes/users.controller';
import { AuthMiddleware } from '@vibeschedule/backend/services/auth/auth.middleware';
import { AnalyticsController } from '@vibeschedule/backend/api/routes/analytics.controller';
import { IntegrationsController } from '@vibeschedule/backend/api/routes/integrations.controller';
import { SettingsController } from '@vibeschedule/backend/api/routes/settings.controller';
import { PostsController } from '@vibeschedule/backend/api/routes/posts.controller';
import { MediaController } from '@vibeschedule/backend/api/routes/media.controller';
import { RootController } from '@vibeschedule/backend/api/routes/root.controller';
import { PfmWebhookController } from '@vibeschedule/backend/api/routes/pfm.webhook.controller';

const authenticatedControllers = [
  UsersController,
  AnalyticsController,
  IntegrationsController,
  SettingsController,
  PostsController,
  MediaController,
];

@Module({
  controllers: [
    RootController,
    AuthController,
    PfmWebhookController,
    ...authenticatedControllers,
  ],
})
export class ApiModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(...authenticatedControllers);
  }
}
