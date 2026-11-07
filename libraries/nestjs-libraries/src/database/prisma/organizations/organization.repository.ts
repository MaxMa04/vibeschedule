import { PrismaRepository } from '@vibeschedule/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { randomBytes } from 'crypto';

const newApiKey = () => randomBytes(32).toString('hex');

const teamUserSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
} as const;

@Injectable()
export class OrganizationRepository {
  constructor(
    private _organization: PrismaRepository<'organization'>,
    private _userOrg: PrismaRepository<'userOrganization'>,
    private _user: PrismaRepository<'user'>
  ) {}

  countUsers() {
    return this._user.model.user.count();
  }

  createWorkspace(name: string, email: string, password: string) {
    return this._organization.model.organization.create({
      data: {
        name,
        apiKey: newApiKey(),
        users: {
          create: {
            role: Role.ADMIN,
            user: { create: { email, password } },
          },
        },
      },
      select: { id: true },
    });
  }

  getOrgByApiKey(apiKey: string) {
    return this._organization.model.organization.findFirst({
      where: { apiKey },
    });
  }

  rotateApiKey(orgId: string) {
    return this._organization.model.organization.update({
      where: { id: orgId },
      data: { apiKey: newApiKey() },
      select: { id: true, name: true, apiKey: true },
    });
  }

  async getTeam(orgId: string) {
    const members = await this._userOrg.model.userOrganization.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'asc' },
      select: { role: true, user: { select: teamUserSelect } },
    });
    return members.map(({ role, user }) => ({ ...user, role }));
  }

  getMember(orgId: string, userId: string) {
    return this._userOrg.model.userOrganization.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
      select: { userId: true },
    });
  }

  emailExists(email: string) {
    return this._user.model.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
  }

  async createMember(
    orgId: string,
    data: { email: string; name: string; password: string; role: Role }
  ) {
    const user = await this._user.model.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: data.password,
        organizations: {
          create: { organizationId: orgId, role: data.role },
        },
      },
      select: teamUserSelect,
    });
    return { ...user, role: data.role };
  }

  async setPassword(userId: string, password: string) {
    await this._user.model.user.update({
      where: { id: userId },
      data: { password },
      select: { id: true },
    });
  }

  // a user exists only as a member of the one workspace, so removing the
  // membership removes the account (the membership cascades)
  async deleteMember(userId: string) {
    await this._user.model.user.delete({
      where: { id: userId },
      select: { id: true },
    });
  }
}
