import { IsOptional, IsString, MinLength } from 'class-validator';

export class AppNameDto {
  @IsString()
  @MinLength(1)
  name: string;
}

export class IntegrationAppDto {
  @IsOptional()
  @IsString()
  appId?: string | null;
}
