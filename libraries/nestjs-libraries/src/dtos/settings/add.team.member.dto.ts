import {
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

// a clipper runs a handful of accounts, the SOP allows 3
export const MAX_CLIPPER_ACCOUNTS = 20;

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

  // how many accounts a clipper may connect, 3 if not given
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_CLIPPER_ACCOUNTS)
  clipperAccounts?: number;

  // the channels the user is responsible for, a clipper sees only these
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

export class ClipperAccountsDto {
  @IsInt()
  @Min(0)
  @Max(MAX_CLIPPER_ACCOUNTS)
  accounts: number;
}

export class ChannelUsersDto {
  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}
