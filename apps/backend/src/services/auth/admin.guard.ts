import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SessionUser } from '@vibeschedule/nestjs-libraries/user/user.from.request';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const user: SessionUser = context.switchToHttp().getRequest().user;
    if (user?.role !== 'ADMIN') {
      throw new ForbiddenException('Nur für Admins');
    }
    return true;
  }
}
