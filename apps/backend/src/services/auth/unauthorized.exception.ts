import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { clearAuthCookie } from '@vibeschedule/backend/services/auth/auth.cookie';

// A missing or stale session: drop the cookie so the frontend shows the login
export class UnauthorizedSessionException extends HttpException {
  constructor() {
    super('Unauthorized', 401);
  }
}

@Catch(UnauthorizedSessionException)
export class UnauthorizedSessionFilter implements ExceptionFilter {
  catch(exception: UnauthorizedSessionException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    clearAuthCookie(response);
    response.status(401).send();
  }
}
