import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { LoginUserDto } from '@vibeschedule/nestjs-libraries/dtos/auth/login.user.dto';
import { UsersService } from '@vibeschedule/nestjs-libraries/database/prisma/users/users.service';
import { setAuthCookie } from '@vibeschedule/backend/services/auth/auth.cookie';
import { ClipperApplicationsService } from '@vibeschedule/nestjs-libraries/database/prisma/clippers/clipper.applications.service';

@Controller('/auth')
export class AuthController {
  constructor(
    private _usersService: UsersService,
    private _applicationsService: ClipperApplicationsService
  ) {}

  @Post('/login')
  async login(@Body() body: LoginUserDto, @Res() response: Response) {
    try {
      const jwt = await this._usersService.login(body.email, body.password);
      setAuthCookie(response, jwt);
      response.header('reload', 'true');
      response.status(200).json({ login: true });
    } catch (e: any) {
      // an applicant without a login yet learns where the application stands
      const hint = await this._applicationsService.loginHint(
        body.email,
        body.password
      );
      response.status(400).send(hint || e.message);
    }
  }
}
