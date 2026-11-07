import { IsUrl, Validate } from 'class-validator';
import { ValidUrlExtension } from '@vibeschedule/helpers/utils/valid.url.path';

export class UploadDto {
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @Validate(ValidUrlExtension)
  url: string;
}
