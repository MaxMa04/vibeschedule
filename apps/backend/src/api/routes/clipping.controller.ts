import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ClipperApplicationsService } from '@vibeschedule/nestjs-libraries/database/prisma/clippers/clipper.applications.service';
import { ApplyDto } from '@vibeschedule/nestjs-libraries/dtos/clippers/clipper.dto';

// The public page /clipping: our offer and the application, without a login
@Controller('/clipping')
export class ClippingController {
  constructor(private _applicationsService: ClipperApplicationsService) {}

  @Get('/offer')
  offer() {
    return this._applicationsService.offer();
  }

  @Post('/apply')
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  apply(@Body() body: ApplyDto) {
    return this._applicationsService.apply(body);
  }
}
