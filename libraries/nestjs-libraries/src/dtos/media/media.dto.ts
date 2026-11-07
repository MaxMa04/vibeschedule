import { IsDefined, IsString, Validate } from 'class-validator';
import {
  ValidUrlExtension,
  ValidUrlPath,
} from '@vibeschedule/helpers/utils/valid.url.path';

export class MediaDto {
  @IsString()
  @IsDefined()
  id: string;

  @IsString()
  @IsDefined()
  @Validate(ValidUrlPath)
  @Validate(ValidUrlExtension)
  path: string;
}
