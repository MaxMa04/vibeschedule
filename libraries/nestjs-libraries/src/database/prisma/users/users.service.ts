import { BadRequestException, Injectable } from '@nestjs/common';
import { UsersRepository } from '@vibeschedule/nestjs-libraries/database/prisma/users/users.repository';
import { AuthService } from '@vibeschedule/helpers/auth/auth.service';
import { ChangePasswordDto } from '@vibeschedule/nestjs-libraries/dtos/users/change.password.dto';

@Injectable()
export class UsersService {
  constructor(private _usersRepository: UsersRepository) {}

  async login(email: string, password: string) {
    const user = await this._usersRepository.getUserByEmail(email);
    if (!user || !AuthService.comparePassword(password, user.password)) {
      throw new Error('E-Mail oder Passwort ist falsch');
    }

    return AuthService.signJWT({ id: user.id });
  }

  getMembership(userId: string) {
    return this._usersRepository.getMembership(userId);
  }

  async changePassword(userId: string, body: ChangePasswordDto) {
    const user = await this._usersRepository.getUserById(userId);
    if (
      !user ||
      !AuthService.comparePassword(body.currentPassword, user.password)
    ) {
      throw new BadRequestException('Das aktuelle Passwort ist falsch');
    }

    await this._usersRepository.updatePassword(
      userId,
      AuthService.hashPassword(body.newPassword)
    );
  }

  updateTimezone(userId: string, timezoneName?: string) {
    return this._usersRepository.updateTimezone(userId, timezoneName || null);
  }
}
