import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@vibeschedule/nestjs-libraries/user/org.from.request';
import { MediaService } from '@vibeschedule/nestjs-libraries/database/prisma/media/media.service';
import { GetMediaDto } from '@vibeschedule/nestjs-libraries/dtos/media/get.media.dto';
import handleR2Upload, {
  publicUrl,
} from '@vibeschedule/nestjs-libraries/upload/r2.uploader';

@Controller('/media')
export class MediaController {
  constructor(private _mediaService: MediaService) {}

  @Get('/')
  getMedia(
    @GetOrgFromRequest() org: Organization,
    @Query() query: GetMediaDto
  ) {
    return this._mediaService.getMedia(org.id, query.page, query.search);
  }

  @Delete('/:id')
  deleteMedia(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this._mediaService.deleteMedia(org.id, id);
  }

  // the bare object name of a file already in the bucket
  @Post('/save-media')
  saveMedia(
    @GetOrgFromRequest() org: Organization,
    @Body('name') name: string,
    @Body('originalName') originalName?: string
  ) {
    if (
      typeof name !== 'string' ||
      !/^[\w.-]+$/.test(name) ||
      /^\.+$/.test(name)
    ) {
      throw new BadRequestException('Ungültiger Dateiname');
    }
    return this._mediaService.saveFile(
      org.id,
      name,
      publicUrl(name),
      originalName
    );
  }

  // R2 multipart upload steps of the Uppy uploader
  @Post('/:endpoint')
  async uploadFile(
    @GetOrgFromRequest() org: Organization,
    @Req() req: Request,
    @Res() res: Response,
    @Param('endpoint') endpoint: string
  ) {
    const upload = await handleR2Upload(endpoint, req, res);
    if (endpoint !== 'complete-multipart-upload' || res.headersSent) {
      return upload;
    }

    const { Location } = upload as { Location: string };
    const saved = await this._mediaService.saveFile(
      org.id,
      Location.split('/').pop()!,
      Location,
      req.body.file?.name
    );
    res.status(200).json({ Location, saved });
  }
}
