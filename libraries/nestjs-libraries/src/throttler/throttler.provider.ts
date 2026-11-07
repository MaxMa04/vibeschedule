import { ThrottlerGuard } from '@nestjs/throttler';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';

const isThrottled = (method: string, url: string) =>
  method === 'POST' &&
  (url.includes('/public/v1/posts') || url.startsWith('/auth/login'));

// Post creation through the public API (per workspace) and login (per client)
@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  public override async canActivate(
    context: ExecutionContext
  ): Promise<boolean> {
    const { url, method } = context.switchToHttp().getRequest<Request>();
    return isThrottled(method, url) ? super.canActivate(context) : true;
  }

  protected override async getTracker(
    req: Record<string, any>
  ): Promise<string> {
    const forwarded = String(req.headers?.['x-forwarded-for'] || '')
      .split(',')[0]
      .trim();
    return req.org?.id || forwarded || req.ip;
  }
}
