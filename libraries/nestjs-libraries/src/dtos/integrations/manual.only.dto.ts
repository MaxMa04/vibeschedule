import { IsBoolean } from 'class-validator';

export class ManualOnlyDto {
  @IsBoolean()
  manualOnly: boolean;
}
