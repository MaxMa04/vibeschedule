import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import {
  ClipperAccountRow,
  ClipperRepository,
} from '@vibeschedule/nestjs-libraries/database/prisma/clippers/clipper.repository';
import { IntegrationService } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/integration.service';
import { SessionUser } from '@vibeschedule/nestjs-libraries/user/user.from.request';
import { billingDay } from '@vibeschedule/helpers/clippers/clipper.billing';
import {
  AccountPlan,
  AccountTaskKey,
  normalizeUsername,
  onboardingDone,
  openWarmup,
  planAccounts,
  taskState,
} from '@vibeschedule/helpers/clippers/clipper.onboarding';
import {
  formatIban,
  isValidIban,
  normalizeIban,
} from '@vibeschedule/helpers/clippers/iban';
import { removeFile } from '@vibeschedule/nestjs-libraries/upload/r2.uploader';
import {
  ClipperProfileDto,
  PayoutDto,
} from '@vibeschedule/nestjs-libraries/dtos/clippers/clipper.dto';

const profileReady = (account: ClipperAccountRow) =>
  !!(account.name && account.username && account.avatar);

const connection = (account: ClipperAccountRow) =>
  !account.integration || account.integration.deletedAt
    ? ('none' as const)
    : account.integration.disabled
    ? ('disconnected' as const)
    : ('active' as const);

const searchTerms = (value: string | null) =>
  (value || '')
    .split(/[\n,]/)
    .map((term) => term.trim())
    .filter(Boolean);

// What a clipper sees and checks off while creating and warming up the
// accounts we hand out (ClipperAccount). The order and the days come from
// planAccounts in clipper.onboarding.ts; every step is checked here again, so
// nothing can be skipped through the API.
@Injectable()
export class ClipperOnboardingService {
  constructor(
    private _clipperRepository: ClipperRepository,
    private _integrationService: IntegrationService
  ) {}

  // One account row per agreed account. Rows beyond a lowered number go
  // away only when nothing was entered or done on them. The very first time
  // the channels a clipper already runs fill the rows, so clippers from
  // before the onboarding start with their accounts done.
  async ensureAccounts(orgId: string, userId: string) {
    const member = await this._clipperRepository.clipperMember(orgId, userId);
    if (!member) {
      return [];
    }
    let accounts = await this._clipperRepository.accounts(orgId, userId);
    const firstTime = !accounts.length;

    const missing = Array.from(
      { length: member.clipperAccounts },
      (_, i) => i
    ).filter((position) => !accounts.some((a) => a.position === position));
    const unused = accounts.filter(
      (a) =>
        a.position >= member.clipperAccounts &&
        !a.integration &&
        !a.createdOn &&
        !a.name &&
        !a.username &&
        !a.avatar
    );
    if (missing.length) {
      await this._clipperRepository.createAccounts(orgId, userId, missing);
    }
    if (unused.length) {
      await this._clipperRepository.deleteAccounts(unused.map((a) => a.id));
    }
    if (missing.length || unused.length) {
      accounts = await this._clipperRepository.accounts(orgId, userId);
    }

    if (firstTime) {
      const channels = await this._clipperRepository.userChannelIds(
        orgId,
        userId
      );
      const free = accounts.filter((a) => !a.integration);
      for (const [i, { integrationId }] of channels.entries()) {
        if (free[i]) {
          await this._clipperRepository.linkChannel(free[i].id, integrationId);
        }
      }
      if (channels.length && free.length) {
        accounts = await this._clipperRepository.accounts(orgId, userId);
      }
    }
    return accounts;
  }

  // A channel that came to a clipper (through the connect link of one of
  // their accounts, or handed over by an admin) fills that account, or the
  // first one without a channel
  async channelArrived(
    orgId: string,
    userId: string,
    channelId: string,
    accountId?: string | null
  ) {
    const accounts = await this.ensureAccounts(orgId, userId);
    if (accounts.some((a) => a.integration?.id === channelId)) {
      return;
    }
    const target =
      accounts.find((a) => a.id === accountId) ||
      accounts.find((a) => !a.integration);
    if (target) {
      await this._clipperRepository.linkChannel(target.id, channelId);
    }
  }

  private present(account: ClipperAccountRow, plan: AccountPlan) {
    const channel =
      account.integration && !account.integration.deletedAt
        ? account.integration
        : null;
    return {
      id: account.id,
      position: account.position,
      profile: {
        name: account.name,
        username: account.username,
        bio: account.bio,
        avatar: account.avatar,
        topic: account.topic,
        searchTerms: searchTerms(account.searchTerms),
        ready: profileReady(account),
      },
      createdDay: account.createdOn ? billingDay(account.createdOn) : null,
      plan,
      channel: channel && {
        id: channel.id,
        name: channel.customName || channel.name,
        username: channel.profile,
        picture: channel.picture,
        disabled: channel.disabled,
      },
      // the connected TikTok account is not the one we handed out
      usernameMismatch:
        !!channel &&
        !!account.username &&
        !!channel.profile &&
        normalizeUsername(channel.profile) !==
          normalizeUsername(account.username),
    };
  }

  private plan(accounts: ClipperAccountRow[]) {
    const plans = planAccounts(
      accounts.map((account) => ({
        id: account.id,
        profileReady: profileReady(account),
        createdDay: account.createdOn ? billingDay(account.createdOn) : null,
        warmupDays: account.warmups.map((w) => billingDay(w)),
        fypOk: !!account.fypOkAt,
        connection: connection(account),
      })),
      billingDay(new Date())
    );
    return accounts.map((account, i) => this.present(account, plans[i]));
  }

  // the clipper's own onboarding
  async state(orgId: string, user: SessionUser) {
    if (user.role !== Role.CLIPPER) {
      return null;
    }
    const [member, accounts] = await Promise.all([
      this._clipperRepository.clipperMember(orgId, user.id),
      this.ensureAccounts(orgId, user.id),
    ]);
    const presented = this.plan(accounts);
    const payoutDone = !!member?.payoutIban;
    return {
      today: billingDay(new Date()),
      payout: {
        done: payoutDone,
        name: member?.payoutName || null,
        iban: member?.payoutIban ? formatIban(member.payoutIban) : null,
      },
      accounts: presented,
      done: onboardingDone(
        presented.map((a) => a.plan),
        payoutDone
      ),
    };
  }

  // every clipper with their accounts, for admins
  async overview(orgId: string) {
    const members = await this._clipperRepository.clipperMembers(orgId);
    const clippers = [];
    for (const member of members) {
      const accounts = this.plan(
        await this.ensureAccounts(orgId, member.user.id)
      );
      clippers.push({
        user: member.user,
        maxAccounts: member.clipperAccounts,
        since: member.createdAt,
        payout: {
          name: member.payoutName,
          iban: member.payoutIban ? formatIban(member.payoutIban) : null,
        },
        accounts,
        done: onboardingDone(
          accounts.map((a) => a.plan),
          !!member.payoutIban
        ),
      });
    }
    return { clippers };
  }

  async setPayout(orgId: string, user: SessionUser, body: PayoutDto) {
    if (!isValidIban(body.iban)) {
      throw new BadRequestException(
        'Die IBAN stimmt nicht. Prüf sie bitte noch mal.'
      );
    }
    await this._clipperRepository.setPayout(orgId, user.id, {
      payoutName: body.name,
      payoutIban: normalizeIban(body.iban),
    });
    return this.state(orgId, user);
  }

  // the account with its plan, only the clipper's own
  private async own(orgId: string, user: SessionUser, id: string) {
    if (user.role !== Role.CLIPPER) {
      throw new NotFoundException('Account nicht gefunden');
    }
    const accounts = this.plan(await this.ensureAccounts(orgId, user.id));
    const account = accounts.find((a) => a.id === id);
    if (!account) {
      throw new NotFoundException('Account nicht gefunden');
    }
    return account;
  }

  private async step(
    orgId: string,
    user: SessionUser,
    id: string,
    key: AccountTaskKey | 'warmup',
    data: Prisma.ClipperAccountUncheckedUpdateInput
  ) {
    const account = await this.own(orgId, user, id);
    const open =
      key === 'warmup'
        ? !!openWarmup(account.plan)
        : taskState(account.plan, key) === 'open';
    if (!open) {
      throw new BadRequestException(
        'Dieser Schritt ist gerade noch nicht dran.'
      );
    }
    await this._clipperRepository.updateAccount(id, data);
    return this.state(orgId, user);
  }

  created(orgId: string, user: SessionUser, id: string) {
    return this.step(orgId, user, id, 'create', { createdOn: new Date() });
  }

  warmup(orgId: string, user: SessionUser, id: string) {
    return this.step(orgId, user, id, 'warmup', {
      warmups: { push: new Date() },
    });
  }

  // a No only shows whom to ask, the step stays open
  async fyp(orgId: string, user: SessionUser, id: string, ok: boolean) {
    if (!ok) {
      await this.own(orgId, user, id);
      return this.state(orgId, user);
    }
    return this.step(orgId, user, id, 'fyp', { fypOkAt: new Date() });
  }

  async connectUrl(orgId: string, user: SessionUser, id: string) {
    const account = await this.own(orgId, user, id);
    if (taskState(account.plan, 'connect') !== 'open') {
      throw new BadRequestException(
        'Verbinde den Account erst, wenn das Aufwärmen fertig ist.'
      );
    }
    return this._integrationService.getConnectUrl(
      orgId,
      'tiktok',
      {},
      user.id,
      account.id
    );
  }

  async avatar(orgId: string, user: SessionUser, id: string) {
    const account = await this.own(orgId, user, id);
    if (!account.profile.avatar) {
      throw new NotFoundException('Noch kein Profilbild');
    }
    const ext = account.profile.avatar.split('.').pop() || 'jpg';
    return {
      url: account.profile.avatar,
      name: `${account.profile.username || 'profilbild'}.${ext}`,
    };
  }

  // The account was banned or is lost: start over with a new one. The old
  // channel stays with the clipper, so its posts are still paid.
  async restart(orgId: string, id: string, user?: SessionUser) {
    if (user) {
      await this.own(orgId, user, id);
    } else if (!(await this._clipperRepository.getAccount(orgId, id))) {
      throw new NotFoundException('Account nicht gefunden');
    }
    await this._clipperRepository.updateAccount(id, {
      createdOn: null,
      warmups: [],
      fypOkAt: null,
      integrationId: null,
    });
    return user ? this.state(orgId, user) : { ok: true };
  }

  async updateProfile(orgId: string, id: string, body: ClipperProfileDto) {
    if (!(await this._clipperRepository.getAccount(orgId, id))) {
      throw new NotFoundException('Account nicht gefunden');
    }
    const value = (v?: string) => (v === undefined ? undefined : v || null);
    await this._clipperRepository.updateAccount(id, {
      name: value(body.name),
      username: value(body.username),
      bio: value(body.bio),
      topic: value(body.topic),
      searchTerms: value(body.searchTerms),
    });
    return { ok: true };
  }

  async setAvatar(orgId: string, id: string, url: string) {
    const account = await this._clipperRepository.getAccount(orgId, id);
    if (!account) {
      await removeFile(url);
      throw new NotFoundException('Account nicht gefunden');
    }
    await this._clipperRepository.updateAccount(id, { avatar: url });
    if (account.avatar) {
      await removeFile(account.avatar).catch(() => undefined);
    }
    return { avatar: url };
  }
}
