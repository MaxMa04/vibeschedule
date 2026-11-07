import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class TikTokDto {
  @IsIn(['public', 'private', 'followers', 'friends'])
  privacy_status: 'public' | 'private' | 'followers' | 'friends';

  @IsOptional()
  @IsBoolean()
  allow_comment?: boolean;

  @IsOptional()
  @IsBoolean()
  allow_duet?: boolean;

  @IsOptional()
  @IsBoolean()
  allow_stitch?: boolean;

  @IsOptional()
  @IsBoolean()
  disclose_your_brand?: boolean;

  @IsOptional()
  @IsBoolean()
  disclose_branded_content?: boolean;

  @IsOptional()
  @IsBoolean()
  is_ai_generated?: boolean;

  // lands in the TikTok inbox as a draft, the user publishes it in the app
  @IsOptional()
  @IsBoolean()
  is_draft?: boolean;

  @IsOptional()
  @IsBoolean()
  auto_add_music?: boolean;
}
