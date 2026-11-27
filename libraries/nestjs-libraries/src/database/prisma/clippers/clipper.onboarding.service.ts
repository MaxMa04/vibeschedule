import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClipperTaskKind, Prisma, Role } from '@prisma/client';
import {
  ClipperAccountRow,
  ClipperRepository,
  ClipperTaskRow,
} from '@vibeschedule/nestjs-libraries/database/prisma/clippers/clipper.repository';
import { IntegrationService } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/integration.service';
import { SessionUser } from '@vibeschedule/nestjs-libraries/user/user.from.request';
import { billingDay } from '@vibeschedule/helpers/clippers/clipper.billing';
import {
  AccountPlan,
  AccountTaskKey,
  profileCheck,
  onboardingDone,
  setUpBefore,
  openWarmup,
  planAccounts,
  taskState,
} from '@vibeschedule/helpers/clippers/clipper.onboarding';
import {
  formatIban,
  isValidIban,
  normalizeIban,
} from '@vibeschedule/helpers/clippers/iban';
import {
  needsProfileTask,
  openTaskCount,
  PROFILE_TASK_TITLE,
  profileChanged,
} from '@vibeschedule/helpers/clippers/clipper.tasks';
import {
  accountToDo,
  clipperToDo,
} from '@vibeschedule/helpers/clippers/clipper.todo';
import { removeFile } from '@vibeschedule/nestjs-libraries/upload/r2.uploader';
import {
  ClipperManagerDto,
  ClipperProfileDto,
  ClipperTaskDto,
  ClipperTaskUpdateDto,
  PayoutDto,
} from '@vibeschedule/nestjs-libraries/dtos/clippers/clipper.dto';

const AVATAR = /\.(jpe?g|png|webp)$/i;

const profileReady = (account: ClipperAccountRow) =>
  !!(account.name && account.username && account.avatar);

const connection = (account: ClipperAccountRow) =>
  !account.integration || account.integration.deletedAt
    ? ('none' as const)
    : account.integration.disabled
    ? ('disconnected' as const)
    : ('active' as const);

// the app an account runs for: its own, else the one of its channel
const appOf = (account: ClipperAccountRow) => {
  const app = [account.app, account.integration?.app].find(
    (candidate) => candidate && !candidate.deletedAt
  );
  return app ? { id: app.id, name: app.name, brief: app.brief } : null;
};

// team: everything for admins; otherwise only what the clipper sees, tasks
// for us (forTeam) stay out
const presentTasks = (tasks: ClipperTaskRow[], team: boolean) =>
  tasks
    .filter((task) => team || !task.forTeam)
    .map((task) => ({
      id: task.id,
      kind: task.kind,
      title: task.title,
      description: task.description,
      forTeam: task.forTeam,
      doneDay: task.doneAt ? billingDay(task.doneAt) : null,
      createdAt: task.createdAt,
    }));

type PresentedTask = ReturnType<typeof presentTasks>[number];

// open tasks the clipper has, and those we have
const taskCounts = (tasks: PresentedTask[]) => ({
  openTasks: openTaskCount(tasks.filter((task) => !task.forTeam)),
  teamTasks: openTaskCount(tasks.filter((task) => task.forTeam)),
});

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
      // a new channel runs for the app of its account
      if (target.app && !target.app.deletedAt) {
        await this._clipperRepository.setChannelApp(channelId, target.app.id);
      }
    }
  }

  private present(
    account: ClipperAccountRow,
    plan: AccountPlan,
    team: boolean,
    postedToday: number
  ) {
    const tasks = presentTasks(account.tasks, team);
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
      // the next step, or the posts of the day once it runs
      todo: accountToDo(plan, {
        postedToday,
        postsPerDay: channel?.clipPostsPerDay ?? 1,
      }),
      app: appOf(account),
      tasks,
      ...taskCounts(tasks),
      channel: channel && {
        id: channel.id,
        name: channel.customName || channel.name,
        username: channel.profile,
        picture: channel.picture,
        disabled: channel.disabled,
      },
      ...(() => {
        const check = channel
          ? profileCheck(channel.profile, account, !!account.createdOn)
          : 'ok';
        return {
          // the clipper created and connected a different account
          usernameMismatch: check === 'mismatch',
          // connected before the onboarding: switch it to our profile
          rebrand: check === 'rebrand',
        };
      })(),
    };
  }

  // how many posts of each channel were marked as posted today
  private async postedToday(orgId: string, accounts: ClipperAccountRow[]) {
    const today = billingDay(new Date());
    const ids = accounts
      .map((account) => account.integration?.id)
      .filter((id): id is string => !!id);
    // a Berlin day never starts more than 26 hours ago
    const since = new Date(Date.now() - 26 * 60 * 60 * 1000);
    const counts = new Map<string, number>();
    for (const post of await this._clipperRepository.postedSince(
      orgId,
      ids,
      since
    )) {
      if (post.postedAt && billingDay(post.postedAt) === today) {
        counts.set(post.integrationId, (counts.get(post.integrationId) || 0) + 1);
      }
    }
    return counts;
  }

  private async plan(
    orgId: string,
    accounts: ClipperAccountRow[],
    team: boolean
  ) {
    const posted = await this.postedToday(orgId, accounts);
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
    return accounts.map((account, i) =>
      this.present(
        account,
        plans[i],
        team,
        posted.get(account.integration?.id || '') || 0
      )
    );
  }

  // the apps of the accounts with their briefs, each once
  private apps(accounts: ReturnType<ClipperOnboardingService['present']>[]) {
    const apps = new Map<
      string,
      { id: string; name: string; brief: string | null }
    >();
    for (const account of accounts) {
      if (account.app && !apps.has(account.app.id)) {
        apps.set(account.app.id, account.app);
      }
    }
    return [...apps.values()];
  }

  // the clipper's own onboarding
  async state(orgId: string, user: SessionUser) {
    if (user.role !== Role.CLIPPER) {
      return null;
    }
    const [member, accounts, general] = await Promise.all([
      this._clipperRepository.clipperMember(orgId, user.id),
      this.ensureAccounts(orgId, user.id),
      this._clipperRepository.generalTasks(orgId, [user.id]),
    ]);
    const presented = await this.plan(orgId, accounts, false);
    const payoutDone = !!member?.payoutIban;
    return {
      today: billingDay(new Date()),
      payout: {
        done: payoutDone,
        name: member?.payoutName || null,
        iban: member?.payoutIban ? formatIban(member.payoutIban) : null,
      },
      // who looks after the clipper
      manager: member?.manager
        ? { name: member.manager.name || member.manager.email }
        : null,
      apps: this.apps(presented),
      // tasks about the clipper in general, not about one account
      tasks: presentTasks(general, false),
      accounts: presented,
      done: onboardingDone(
        presented.map((a) => a.plan),
        payoutDone
      ),
    };
  }

  // every clipper with their accounts, for admins; userId: only this one
  async overview(orgId: string, userId?: string) {
    const members = (await this._clipperRepository.clipperMembers(orgId)).filter(
      (member) => !userId || member.user.id === userId
    );
    if (userId && !members.length) {
      throw new NotFoundException('Clipper nicht gefunden');
    }
    const general = await this._clipperRepository.generalTasks(
      orgId,
      members.map((member) => member.user.id)
    );
    const clippers = [];
    for (const member of members) {
      const accounts = await this.plan(
        orgId,
        await this.ensureAccounts(orgId, member.user.id),
        true
      );
      const tasks = presentTasks(
        general.filter((task) => task.userId === member.user.id),
        true
      );
      clippers.push({
        user: member.user,
        manager: member.manager,
        maxAccounts: member.clipperAccounts,
        since: member.createdAt,
        payout: {
          name: member.payoutName,
          iban: member.payoutIban ? formatIban(member.payoutIban) : null,
        },
        tasks,
        ...taskCounts(tasks),
        accounts,
        // what the clipper still has today, and how many accounts wait for us
        todo: clipperToDo(accounts, {
          payoutDone: !!member.payoutIban,
          openTasks: taskCounts(tasks).openTasks,
        }),
        done: onboardingDone(
          accounts.map((a) => a.plan),
          !!member.payoutIban
        ),
      });
    }
    return { clippers };
  }

  async setManager(orgId: string, userId: string, body: ClipperManagerDto) {
    const managerId = body.managerId || null;
    if (
      managerId &&
      !(await this._clipperRepository.teamMember(orgId, managerId))
    ) {
      throw new BadRequestException(
        'Betreuen kann nur jemand aus dem Team (Admin oder Nutzer).'
      );
    }
    if (!(await this._clipperRepository.setManager(orgId, userId, managerId))) {
      throw new NotFoundException('Clipper nicht gefunden');
    }
    return (await this.overview(orgId, userId)).clippers[0];
  }

  async setPayout(orgId: string, user: SessionUser, body: PayoutDto) {
    await this.savePayout(orgId, user.id, body);
    return this.state(orgId, user);
  }

  // an admin enters the payout details the clipper sent another way
  async setPayoutFor(orgId: string, userId: string, body: PayoutDto) {
    if (!(await this._clipperRepository.clipperMember(orgId, userId))) {
      throw new NotFoundException('Clipper nicht gefunden');
    }
    await this.savePayout(orgId, userId, body);
    return (await this.overview(orgId, userId)).clippers[0];
  }

  private async savePayout(orgId: string, userId: string, body: PayoutDto) {
    if (!isValidIban(body.iban)) {
      throw new BadRequestException(
        'Die IBAN stimmt nicht. Prüf sie bitte noch mal.'
      );
    }
    await this._clipperRepository.setPayout(orgId, userId, {
      payoutName: body.name,
      payoutIban: normalizeIban(body.iban),
    });
  }

  // The clipper already created and warmed up the account outside the app:
  // an admin marks it, so connecting opens today (see setUpBefore)
  async markSetUp(orgId: string, id: string) {
    const account = await this._clipperRepository.getAccount(orgId, id);
    if (!account) {
      throw new NotFoundException('Account nicht gefunden');
    }
    if (account.integration && !account.integration.deletedAt) {
      throw new BadRequestException('Der Account ist schon verbunden.');
    }
    const day = (value: string) => new Date(`${value}T12:00:00Z`);
    const before = setUpBefore(billingDay(new Date()));
    await this._clipperRepository.updateAccount(id, {
      createdOn: day(before.createdDay),
      warmups: before.warmupDays.map(day),
      fypOkAt: new Date(),
    });
    return this.account(orgId, id);
  }

  // the account with its plan, only the clipper's own
  private async own(orgId: string, user: SessionUser, id: string) {
    if (user.role !== Role.CLIPPER) {
      throw new NotFoundException('Account nicht gefunden');
    }
    const accounts = await this.plan(
      orgId,
      await this.ensureAccounts(orgId, user.id),
      false
    );
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
    // the tasks were for the lost account
    await this._clipperRepository.deleteAccountTasks(id);
    return user ? this.state(orgId, user) : { ok: true };
  }

  // one account with its plan and tasks, for admins
  async account(orgId: string, id: string) {
    const row = await this._clipperRepository.getAccount(orgId, id);
    if (!row) {
      throw new NotFoundException('Account nicht gefunden');
    }
    // the plan depends on the accounts before it
    const account = (
      await this.plan(
        orgId,
        await this._clipperRepository.accounts(orgId, row.userId),
        true
      )
    ).find((a) => a.id === id);
    if (!account) {
      throw new NotFoundException('Account nicht gefunden');
    }
    return account;
  }

  async updateProfile(orgId: string, id: string, body: ClipperProfileDto) {
    const account = await this._clipperRepository.getAccount(orgId, id);
    if (!account) {
      throw new NotFoundException('Account nicht gefunden');
    }
    const value = (v?: string) => (v === undefined ? undefined : v || null);
    const profile = {
      name: value(body.name),
      username: value(body.username),
      bio: value(body.bio),
    };
    const appId = value(body.appId ?? undefined);
    if (appId && !(await this._clipperRepository.getApp(orgId, appId))) {
      throw new BadRequestException('App nicht gefunden');
    }
    await this._clipperRepository.updateAccount(id, {
      ...profile,
      topic: value(body.topic),
      searchTerms: value(body.searchTerms),
      ...(body.appId === undefined ? {} : { appId }),
    });
    // the connected channel runs for the same app
    const channel = account.integration;
    if (body.appId !== undefined && appId && channel && !channel.deletedAt) {
      await this._clipperRepository.setChannelApp(channel.id, appId);
    }
    await this.profileTask(orgId, account, profileChanged(account, profile));
    return this.account(orgId, id);
  }

  // the picture as uploaded by the multer stream engine (already on R2)
  async setAvatar(orgId: string, id: string, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Kein Bild');
    }
    const url = file.path;
    if (!AVATAR.test(url)) {
      await removeFile(url);
      throw new BadRequestException('Nur JPG, PNG oder WebP');
    }
    const account = await this._clipperRepository.getAccount(orgId, id);
    if (!account) {
      await removeFile(url);
      throw new NotFoundException('Account nicht gefunden');
    }
    await this._clipperRepository.updateAccount(id, { avatar: url });
    if (account.avatar) {
      await removeFile(account.avatar).catch(() => undefined);
    }
    await this.profileTask(orgId, account, true);
    return { avatar: url };
  }

  // a new profile on an account the clipper already set up has to be
  // switched over in TikTok, see needsProfileTask
  private async profileTask(
    orgId: string,
    account: ClipperAccountRow,
    changed: boolean
  ) {
    const started =
      !!account.createdOn ||
      !!(account.integration && !account.integration.deletedAt);
    const openProfileTask = account.tasks.some(
      (task) => task.kind === ClipperTaskKind.PROFILE && !task.doneAt
    );
    if (needsProfileTask({ changed, started, openProfileTask })) {
      await this._clipperRepository.createTask(
        orgId,
        { userId: account.userId, accountId: account.id },
        { kind: ClipperTaskKind.PROFILE, title: PROFILE_TASK_TITLE }
      );
    }
  }

  // An admin gives the clipper something to do on an account. A second
  // open profile task would only show the same profile twice.
  async addTask(orgId: string, accountId: string, body: ClipperTaskDto) {
    const account = await this._clipperRepository.getAccount(orgId, accountId);
    if (!account) {
      throw new NotFoundException('Account nicht gefunden');
    }
    const kind = body.kind || ClipperTaskKind.CUSTOM;
    const title =
      body.title || (kind === ClipperTaskKind.PROFILE ? PROFILE_TASK_TITLE : '');
    if (!title) {
      throw new BadRequestException('Die Aufgabe braucht einen Titel.');
    }
    const duplicate =
      kind === ClipperTaskKind.PROFILE &&
      account.tasks.some(
        (task) => task.kind === ClipperTaskKind.PROFILE && !task.doneAt
      );
    if (!duplicate) {
      await this._clipperRepository.createTask(
        orgId,
        { userId: account.userId, accountId },
        {
          kind,
          title,
          description: body.description || null,
          // the profile task is always the clipper's
          forTeam: kind === ClipperTaskKind.CUSTOM && !!body.forTeam,
        }
      );
    }
    return this.account(orgId, accountId);
  }

  // a task about the clipper in general, e.g. sending the pay
  async addGeneralTask(orgId: string, userId: string, body: ClipperTaskDto) {
    if (!(await this._clipperRepository.clipperMember(orgId, userId))) {
      throw new NotFoundException('Clipper nicht gefunden');
    }
    if (body.kind === ClipperTaskKind.PROFILE) {
      throw new BadRequestException(
        'Eine Profil-Aufgabe gehört zu einem Account.'
      );
    }
    if (!body.title) {
      throw new BadRequestException('Die Aufgabe braucht einen Titel.');
    }
    await this._clipperRepository.createTask(
      orgId,
      { userId, accountId: null },
      {
        kind: ClipperTaskKind.CUSTOM,
        title: body.title,
        description: body.description || null,
        forTeam: !!body.forTeam,
      }
    );
    return (await this.overview(orgId, userId)).clippers[0];
  }

  // after a change: the account, or the clipper for a general task
  private async afterTaskChange(
    orgId: string,
    task: { account: { id: string } | null; userId: string | null }
  ) {
    if (task.account) {
      return this.account(orgId, task.account.id);
    }
    return task.userId
      ? (await this.overview(orgId, task.userId)).clippers[0]
      : { ok: true };
  }

  async updateTask(
    orgId: string,
    id: string,
    body: ClipperTaskUpdateDto,
    // null through the public API
    adminId: string | null
  ) {
    const task = await this._clipperRepository.getTask(orgId, id);
    if (!task) {
      throw new NotFoundException('Aufgabe nicht gefunden');
    }
    await this._clipperRepository.updateTask(id, {
      title: body.title || undefined,
      description:
        body.description === undefined ? undefined : body.description || null,
      ...(body.done === undefined
        ? {}
        : body.done
        ? { doneAt: task.doneAt || new Date(), doneById: adminId }
        : { doneAt: null, doneById: null }),
    });
    return this.afterTaskChange(orgId, task);
  }

  async deleteTask(orgId: string, id: string) {
    const task = await this._clipperRepository.getTask(orgId, id);
    if (!task) {
      throw new NotFoundException('Aufgabe nicht gefunden');
    }
    await this._clipperRepository.deleteTask(id);
    return this.afterTaskChange(orgId, task);
  }

  // the clipper checks a task off, or takes the tick back: only an own one,
  // never one for us
  async checkTask(orgId: string, user: SessionUser, id: string, done: boolean) {
    const task = await this._clipperRepository.getTask(orgId, id);
    const owner = task?.account?.userId ?? task?.userId;
    if (
      !task ||
      task.forTeam ||
      user.role !== Role.CLIPPER ||
      owner !== user.id
    ) {
      throw new NotFoundException('Aufgabe nicht gefunden');
    }
    await this._clipperRepository.updateTask(
      id,
      done
        ? { doneAt: task.doneAt || new Date(), doneById: user.id }
        : { doneAt: null, doneById: null }
    );
    return this.state(orgId, user);
  }
}
