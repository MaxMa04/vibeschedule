import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { AuthService } from '@vibeschedule/helpers/auth/auth.service';
import { UsersService } from '@vibeschedule/nestjs-libraries/database/prisma/users/users.service';
import { UnauthorizedSessionException } from '@vibeschedule/backend/services/auth/unauthorized.exception';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private _usersService: UsersService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const auth = (req.headers.auth as string) || req.cookies.auth;
    let payload: { id?: string };
    try {
      payload = AuthService.verifyJWT(auth) as { id?: string };
    } catch {
      throw new UnauthorizedSessionException();
    }

    // the token only names the user, role and workspace come from the database
    const membership =
      typeof payload.id === 'string'
        ? await this._usersService.getMembership(payload.id)
        : null;
    if (!membership) {
      throw new UnauthorizedSessionException();
    }

    // @ts-expect-error request augmentation
    req.user = { ...membership.user, role: membership.role };
    // @ts-expect-error request augmentation
    req.org = membership.organization;
    next();
  }
}
