import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { InspirationStatus } from '@prisma/client';

export class AddInspirationDto {
  /** the link, also inside shared text ("Schau dir das an! https://vm.tiktok.com/…") */
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  appId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null;
}

/** left out: unchanged, null: removed */
export class UpdateInspirationDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  appId?: string | null;

  /** setting a format marks an open link as done */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  formatId?: string | null;

  @IsOptional()
  @IsEnum(InspirationStatus)
  status?: InspirationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null;
}

export class InspirationQueryDto {
  /** App id, `none` for links without an app */
  @IsOptional()
  @IsString()
  app?: string;

  @IsOptional()
  @IsEnum(InspirationStatus)
  status?: InspirationStatus;

  /** Format id, `none` for links without a format */
  @IsOptional()
  @IsString()
  format?: string;
}
