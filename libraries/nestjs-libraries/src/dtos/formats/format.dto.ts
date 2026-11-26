import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { FormatStatus } from '@prisma/client';

export class FormatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}

export class IntegrationFormatDto {
  @IsOptional()
  @IsEnum(FormatStatus)
  status?: FormatStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class FormatsOverviewQueryDto {
  /** App id, `none` for channels without an app */
  @IsOptional()
  @IsString()
  app?: string;

  /** responsible user id, `me` for the signed-in user */
  @IsOptional()
  @IsString()
  user?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;
}

export class FeedPostFormatDto {
  /** share link, platform post id or PfM post id of the published post */
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  post: string;

  /** format id, null removes the format */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  formatId?: string | null;
}
