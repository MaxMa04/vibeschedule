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

  /** `no` leaves out clipper channels, otherwise `user` includes the channels of their clippers */
  @IsOptional()
  @IsString()
  clippers?: string;
}
