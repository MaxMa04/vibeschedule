import { IsIn, IsOptional } from 'class-validator';

export class FacebookDto {
  @IsOptional()
  @IsIn(['timeline', 'reels', 'stories'])
  placement?: 'timeline' | 'reels' | 'stories';
}
