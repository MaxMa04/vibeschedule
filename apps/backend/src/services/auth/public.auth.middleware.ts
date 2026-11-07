import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { OrganizationService } from '@vibeschedule/nestjs-libraries/database/prisma/organizations/organization.service';

@Injectable()
export class PublicAuthMiddleware implements NestMiddleware {
  constructor(private _organizationService: OrganizationService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const apiKey = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!apiKey) {
      res.status(HttpStatus.UNAUTHORIZED).json({ msg: 'No API Key found' });
      return;
    }

    const org = await this._organizationService.getOrgByApiKey(apiKey);
    if (!org) {
      res.status(HttpStatus.UNAUTHORIZED).json({ msg: 'Invalid API key' });
      return;
    }

    // @ts-expect-error request augmentation
    req.org = org;
    next();
  }
}
