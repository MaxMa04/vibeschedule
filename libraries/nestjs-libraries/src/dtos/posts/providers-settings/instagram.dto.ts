import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';

export class InstagramDto {
  @IsOptional()
  @IsIn(['timeline', 'reels', 'stories'])
  placement?: 'timeline' | 'reels' | 'stories';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  collaborators?: string[];

  @IsOptional()
  @IsBoolean()
  share_to_feed?: boolean;
}
