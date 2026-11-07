import { IsBoolean, IsDateString, IsIn, IsOptional } from 'class-validator';

export class ChangeDateDto {
  @IsDateString()
  date: string;

  // update (the default) only moves the post, schedule also queues it again
  @IsOptional()
  @IsIn(['schedule', 'update'])
  action: 'schedule' | 'update' = 'update';

  @IsOptional()
  @IsBoolean()
  republish = false;
}
