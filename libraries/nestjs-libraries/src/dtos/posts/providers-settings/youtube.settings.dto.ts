import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class YoutubeSettingsDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  title: string;

  @IsIn(['public', 'private', 'unlisted'])
  privacy_status: 'public' | 'private' | 'unlisted';

  @IsOptional()
  @IsBoolean()
  made_for_kids?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
