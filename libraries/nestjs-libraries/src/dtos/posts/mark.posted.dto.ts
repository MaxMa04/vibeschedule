import { IsOptional, IsString, MaxLength } from 'class-validator';

export class MarkPostedDto {
  // the link of the post on the platform, helps to find its numbers
  @IsOptional()
  @IsString()
  @MaxLength(500)
  url?: string;
}
