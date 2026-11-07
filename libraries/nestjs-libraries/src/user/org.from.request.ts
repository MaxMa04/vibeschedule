import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Organization } from '@prisma/client';

export const GetOrgFromRequest = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Organization =>
    ctx.switchToHttp().getRequest().org
);
