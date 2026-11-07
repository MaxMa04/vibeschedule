import { IsIn, IsOptional } from 'class-validator';

export class ThreadsDto {
  @IsOptional()
  @IsIn(['timeline', 'reels'])
  placement?: 'timeline' | 'reels';
}
