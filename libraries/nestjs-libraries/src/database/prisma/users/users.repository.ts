import { PrismaRepository } from '@vibeschedule/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersRepository {
  constructor(
    private _user: PrismaRepository<'user'>,
    private _userOrg: PrismaRepository<'userOrganization'>
  ) {}

  getUserByEmail(email: string) {
    return this._user.model.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
  }

  getUserById(id: string) {
    return this._user.model.user.findUnique({ where: { id } });
  }

  // the session: the user without the password, its role and the workspace
  getMembership(userId: string) {
    return this._userOrg.model.userOrganization.findFirst({
      where: { userId },
      select: {
        role: true,
        organization: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            timezoneName: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async updatePassword(id: string, password: string) {
    await this._user.model.user.update({
      where: { id },
      data: { password },
      select: { id: true },
    });
  }

  async updateTimezone(id: string, timezoneName: string | null) {
    await this._user.model.user.update({
      where: { id },
      data: { timezoneName },
      select: { id: true },
    });
  }
}
