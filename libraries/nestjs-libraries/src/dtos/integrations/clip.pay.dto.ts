import { IsInt, IsOptional, Max, Min, ValidateIf } from 'class-validator';

export class ClipPayDto {
  // cents per month, null: the account is not paid
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  feeCents: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  postsPerDay = 1;
}
