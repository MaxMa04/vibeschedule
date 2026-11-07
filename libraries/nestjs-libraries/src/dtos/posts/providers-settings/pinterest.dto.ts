import {
  ArrayNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';

export class PinterestSettingsDto {
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Matches(/^\d+$/, {
    each: true,
    message: 'Board-IDs müssen numerisch sein',
  })
  board_ids: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsUrl()
  link?: string;
}
