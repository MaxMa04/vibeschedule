import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionUser } from '@vibeschedule/nestjs-libraries/user/user.from.request';

const ALLOW_CLIPPER = 'allowClipper';

// Opens a controller or a route for clippers. Everything without it is closed
// for them, so a new route is never open by accident.
export const AllowClipper = () => SetMetadata(ALLOW_CLIPPER, true);

@Injectable()
export class ClipperGuard implements CanActivate {
  constructor(private _reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    // routes without a session (login, webhook, public API) have their own checks
    const user: SessionUser | undefined = context
      .switchToHttp()
      .getRequest().user;
    if (user?.role !== 'CLIPPER') {
      return true;
    }

    if (
      !this._reflector.getAllAndOverride<boolean>(ALLOW_CLIPPER, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      throw new ForbiddenException('Kein Zugriff');
    }
    return true;
  }
}
