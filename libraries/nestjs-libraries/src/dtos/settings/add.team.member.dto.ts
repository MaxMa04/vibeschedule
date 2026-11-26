import {
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class AddTeamMemberDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsIn(['USER', 'ADMIN', 'CLIPPER'])
  role: 'USER' | 'ADMIN' | 'CLIPPER';

  // the channels of a clipper
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];
}

export class UserChannelsDto {
  @IsArray()
  @IsString({ each: true })
  channels: string[];
}
