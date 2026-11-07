process.env.TZ = 'UTC';

import compression from 'compression';
import cookieParser from 'cookie-parser';
import { json, NextFunction, Request, Response } from 'express';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PostValidationExceptionFilter } from '@vibeschedule/backend/api/routes/posts.validation.exception';
import { UnauthorizedSessionFilter } from '@vibeschedule/backend/services/auth/unauthorized.exception';
import { PfmExceptionFilter } from '@vibeschedule/backend/services/pfm.exception';
import { RecordNotFoundFilter } from '@vibeschedule/backend/services/not.found.exception';

async function start() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      ...(!process.env.NOT_SECURED ? { credentials: true } : {}),
      allowedHeaders: ['Content-Type', 'Authorization', 'auth'],
      exposedHeaders: [
        'reload',
        'logout',
        ...(process.env.NOT_SECURED ? ['auth'] : []),
      ],
      origin: [
        process.env.FRONTEND_URL!,
        ...(process.env.MAIN_URL ? [process.env.MAIN_URL] : []),
      ],
    },
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  // wrapped so Nest does not take it for its own json parser and skip that one
  app.use('/posts', (req: Request, res: Response, next: NextFunction) =>
    json({ limit: '50mb' })(req, res, next)
  );
  app.use(cookieParser());
  app.use(compression());
  app.useGlobalFilters(
    new PostValidationExceptionFilter(),
    new UnauthorizedSessionFilter(),
    new PfmExceptionFilter(),
    new RecordNotFoundFilter()
  );

  const server = await app.listen(3000);
  // outlive the load balancer idle timeout, or reused connections end in 502s
  server.keepAliveTimeout = 905_000;
  server.headersTimeout = 906_000;

  Logger.log('Backend is running on port 3000');
}

start();
