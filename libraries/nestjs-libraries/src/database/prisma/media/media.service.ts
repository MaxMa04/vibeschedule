import { BadRequestException, Injectable } from '@nestjs/common';
import { MediaRepository } from '@vibeschedule/nestjs-libraries/database/prisma/media/media.repository';
import { ssrfSafeFetch } from '@vibeschedule/nestjs-libraries/upload/ssrf.guard';
import { uploadStreamToStorage } from '@vibeschedule/nestjs-libraries/upload/custom.upload.validation';

@Injectable()
export class MediaService {
  constructor(private _mediaRepository: MediaRepository) {}

  deleteMedia(org: string, id: string) {
    return this._mediaRepository.deleteMedia(org, id);
  }

  getMedia(org: string, page: number, search?: string) {
    return this._mediaRepository.getMedia(org, page, search);
  }

  saveFile(org: string, name: string, path: string, originalName?: string) {
    return this._mediaRepository.saveFile(org, name, path, originalName);
  }

  async uploadFromUrl(org: string, url: string) {
    const response = await ssrfSafeFetch(url).catch((err) => {
      throw new BadRequestException('URL konnte nicht geladen werden', {
        cause: err,
      });
    });
    if (!response.ok || !response.body) {
      throw new BadRequestException('URL konnte nicht geladen werden');
    }

    const uploaded = await uploadStreamToStorage(
      response.body as ReadableStream,
      Number(response.headers.get('content-length')) || 0
    );
    return this.saveFile(org, uploaded.filename, uploaded.path);
  }
}
