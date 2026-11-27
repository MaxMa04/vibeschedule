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
      select: {
        role: true,
        managerId: true,
        user: {
          select: {
            ...teamUserSelect,
            channels: {
              where: { integration: { deletedAt: null } },
              select: { integrationId: true },
            },
          },
        },
      },
    });
    return members.map(({ role, managerId, user: { channels, ...user } }) => ({
      ...user,
      role,
      managerId,
      channels: channels.map((channel) => channel.integrationId),
    }));
  }

  getMembers(orgId: string, userIds: string[]) {
    return this._userOrg.model.userOrganization.findMany({
      where: { organizationId: orgId, userId: { in: userIds } },
      select: { userId: true, role: true },
    });
  }

  getMember(orgId: string, userId: string) {
    return this._userOrg.model.userOrganization.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
      select: { userId: true, role: true, clipperAccounts: true },
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
    data: {
      email: string;
      name: string;
      password: string;
      role: Role;
      clipperAccounts?: number;
      phone?: string;
    }
  ) {
    const user = await this._user.model.user.create({
      data: {
        email: data.email,
        name: data.name,
        phone: data.phone,
        password: data.password,
        organizations: {
          create: {
            organizationId: orgId,
            role: data.role,
            clipperAccounts: data.clipperAccounts,
          },
        },
      },
      select: teamUserSelect,
    });
    return { ...user, role: data.role };
  }

  // the clippers with the number of accounts agreed with each
  getClippers(orgId: string) {
    return this._userOrg.model.userOrganization.findMany({
      where: { organizationId: orgId, role: Role.CLIPPER },
      orderBy: { createdAt: 'asc' },
      select: {
        clipperAccounts: true,
        payoutName: true,
        payoutIban: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
  }

  async setClipperAccounts(orgId: string, userId: string, accounts: number) {
    const { count } = await this._userOrg.model.userOrganization.updateMany({
      where: { organizationId: orgId, userId, role: Role.CLIPPER },
      data: { clipperAccounts: accounts },
    });
    return count > 0;
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
