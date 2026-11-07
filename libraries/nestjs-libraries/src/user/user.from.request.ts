import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role, User } from '@prisma/client';

export type SessionUser = Omit<User, 'password' | 'updatedAt'> & { role: Role };

export const GetUserFromRequest = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): SessionUser =>
    ctx.switchToHttp().getRequest().user
);
