import { IsEmail, IsIn, IsString } from 'class-validator';

export class LoginUserDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsIn(['LOCAL'])
  provider: 'LOCAL';
}
