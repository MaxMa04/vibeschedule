import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

// the name others see, e.g. clippers their contact person
export class NameDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;
}
