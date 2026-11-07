import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';

export class AddTeamMemberDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsIn(['USER', 'ADMIN'])
  role: 'USER' | 'ADMIN';
}
