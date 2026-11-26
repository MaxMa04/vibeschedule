import { IsOptional, IsString, IsDateString } from 'class-validator';

export class GetPostsDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  app?: string;

  /** responsible user id, `me` for the signed-in user */
  @IsOptional()
  @IsString()
  user?: string;
}
