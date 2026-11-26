import { Injectable } from '@nestjs/common';
import {
  ApplicationStatus,
  ClipperTaskKind,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaRepository } from '@vibeschedule/nestjs-libraries/database/prisma/prisma.service';

const accountSelect = {
  id: true,
  userId: true,
  position: true,
  name: true,
  username: true,
  bio: true,
  avatar: true,
  topic: true,
  searchTerms: true,
  createdOn: true,
  warmups: true,
  fypOkAt: true,
  integration: {
    select: {
      id: true,
      name: true,
      customName: true,
      profile: true,
      picture: true,
      disabled: true,
      deletedAt: true,
    },
  },
  tasks: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      kind: true,
      title: true,
      description: true,
      doneAt: true,
      createdAt: true,
    },
  },
} as const;

export type ClipperAccountRow = Prisma.ClipperAccountGetPayload<{
  select: typeof accountSelect;
}>;

const applicationSelect = {
  id: true,
  status: true,
  name: true,
  email: true,
  phone: true,
  age: true,
  device: true,
  accounts: true,
  experience: true,
  source: true,
  userId: true,
  decidedAt: true,
  createdAt: true,
} as const;

// Applications from the public page and the accounts clippers run for us
@Injectable()
export class ClipperRepository {
  constructor(
    private _application: PrismaRepository<'clipperApplication'>,
    private _account: PrismaRepository<'clipperAccount'>,
    private _task: PrismaRepository<'clipperTask'>,
    private _organization: PrismaRepository<'organization'>,
    private _userIntegration: PrismaRepository<'userIntegration'>,
    private _userOrg: PrismaRepository<'userOrganization'>
  ) {}

  // there is exactly one workspace, the public page applies to it
  workspace() {
    return this._organization.model.organization.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
  }

  createApplication(
    orgId: string,
    data: Omit<
      Prisma.ClipperApplicationUncheckedCreateInput,
      'orgId' | 'id' | 'status'
    >
  ) {
    return this._application.model.clipperApplication.create({
      data: { ...data, orgId },
      select: { id: true },
    });
  }

  pendingApplication(orgId: string, email: string) {
    return this._application.model.clipperApplication.findFirst({
      where: {
        orgId,
        status: ApplicationStatus.PENDING,
        email: { equals: email, mode: 'insensitive' },
      },
      select: { id: true },
    });
  }

  // the newest application of an address, with its password for the login hint
  latestApplication(email: string) {
    return this._application.model.clipperApplication.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
      select: { status: true, password: true },
    });
  }

  applications(orgId: string) {
    return this._application.model.clipperApplication.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: applicationSelect,
    });
  }

  getApplication(orgId: string, id: string) {
    return this._application.model.clipperApplication.findFirst({
      where: { orgId, id },
      select: { ...applicationSelect, password: true },
    });
  }

  // only a pending application can be decided, so a double click does nothing
  async decideApplication(
    orgId: string,
    id: string,
    status: ApplicationStatus,
    userId?: string
  ) {
    const { count } =
      await this._application.model.clipperApplication.updateMany({
        where: { orgId, id, status: ApplicationStatus.PENDING },
        data: { status, userId, decidedAt: new Date() },
      });
    return count > 0;
  }

  accounts(orgId: string, userId: string) {
    return this._account.model.clipperAccount.findMany({
      where: { orgId, userId },
      orderBy: { position: 'asc' },
      select: accountSelect,
    });
  }

  allAccounts(orgId: string) {
    return this._account.model.clipperAccount.findMany({
      where: { orgId },
      orderBy: [{ userId: 'asc' }, { position: 'asc' }],
      select: accountSelect,
    });
  }

  getAccount(orgId: string, id: string) {
    return this._account.model.clipperAccount.findFirst({
      where: { orgId, id },
      select: accountSelect,
    });
  }

  async createAccounts(orgId: string, userId: string, positions: number[]) {
    await this._account.model.clipperAccount.createMany({
      data: positions.map((position) => ({ orgId, userId, position })),
      skipDuplicates: true,
    });
  }

  async deleteAccounts(ids: string[]) {
    await this._account.model.clipperAccount.deleteMany({
      where: { id: { in: ids } },
    });
  }

  updateAccount(id: string, data: Prisma.ClipperAccountUncheckedUpdateInput) {
    return this._account.model.clipperAccount.update({
      where: { id },
      data,
      select: accountSelect,
    });
  }

  createTask(
    orgId: string,
    accountId: string,
    data: { kind: ClipperTaskKind; title: string; description?: string | null }
  ) {
    return this._task.model.clipperTask.create({
      data: { ...data, orgId, accountId },
      select: { id: true },
    });
  }

  // with the account it belongs to, for the owner check
  getTask(orgId: string, id: string) {
    return this._task.model.clipperTask.findFirst({
      where: { orgId, id },
      select: {
        id: true,
        kind: true,
        doneAt: true,
        account: { select: { id: true, userId: true } },
      },
    });
  }

  async updateTask(id: string, data: Prisma.ClipperTaskUncheckedUpdateInput) {
    await this._task.model.clipperTask.update({
      where: { id },
      data,
      select: { id: true },
    });
  }

  async deleteTask(id: string) {
    await this._task.model.clipperTask.delete({
      where: { id },
      select: { id: true },
    });
  }

  async deleteAccountTasks(accountId: string) {
    await this._task.model.clipperTask.deleteMany({ where: { accountId } });
  }

  // a channel belongs to at most one account, a newer link moves it
  async linkChannel(accountId: string, integrationId: string) {
    await this._account.model.clipperAccount.updateMany({
      where: { integrationId, id: { not: accountId } },
      data: { integrationId: null },
    });
    await this._account.model.clipperAccount.update({
      where: { id: accountId },
      data: { integrationId },
      select: { id: true },
    });
  }

  // the TikTok channels a clipper is responsible for, oldest first
  userChannelIds(orgId: string, userId: string) {
    return this._userIntegration.model.userIntegration.findMany({
      where: {
        userId,
        integration: {
          organizationId: orgId,
          deletedAt: null,
          providerIdentifier: 'tiktok',
        },
      },
      orderBy: { integration: { createdAt: 'asc' } },
      select: { integrationId: true },
    });
  }

  clipperMember(orgId: string, userId: string) {
    return this._userOrg.model.userOrganization.findFirst({
      where: { organizationId: orgId, userId, role: Role.CLIPPER },
      select: {
        clipperAccounts: true,
        payoutName: true,
        payoutIban: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
  }

  clipperMembers(orgId: string) {
    return this._userOrg.model.userOrganization.findMany({
      where: { organizationId: orgId, role: Role.CLIPPER },
      orderBy: { createdAt: 'asc' },
      select: {
        clipperAccounts: true,
        payoutName: true,
        payoutIban: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
  }

  async setPayout(
    orgId: string,
    userId: string,
    payout: { payoutName: string; payoutIban: string }
  ) {
    await this._userOrg.model.userOrganization.updateMany({
      where: { organizationId: orgId, userId },
      data: payout,
    });
  }
}
