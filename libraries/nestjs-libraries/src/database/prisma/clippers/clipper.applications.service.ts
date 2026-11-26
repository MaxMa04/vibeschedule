import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApplicationStatus, Role } from '@prisma/client';
import { AuthService } from '@vibeschedule/helpers/auth/auth.service';
import { clipperOffer } from '@vibeschedule/helpers/clippers/clipper.offer';
import { ClipperRepository } from '@vibeschedule/nestjs-libraries/database/prisma/clippers/clipper.repository';
import { ClipperOnboardingService } from '@vibeschedule/nestjs-libraries/database/prisma/clippers/clipper.onboarding.service';
import { OrganizationRepository } from '@vibeschedule/nestjs-libraries/database/prisma/organizations/organization.repository';
import { ApplyDto } from '@vibeschedule/nestjs-libraries/dtos/clippers/clipper.dto';

// Applications from the public page /clipping. The applicant picks the
// password there, accepting turns the application into the clipper login, so
// nobody has to hand out credentials.
@Injectable()
export class ClipperApplicationsService {
  constructor(
    private _clipperRepository: ClipperRepository,
    private _organizationRepository: OrganizationRepository,
    private _onboardingService: ClipperOnboardingService
  ) {}

  offer() {
    return clipperOffer();
  }

  async apply(body: ApplyDto) {
    // a filled hidden field: a bot, it gets the same answer as a person
    if (body.website) {
      return { ok: true };
    }
    const workspace = await this._clipperRepository.workspace();
    if (!workspace) {
      throw new ServiceUnavailableException(
        'Bewerbungen sind gerade nicht möglich'
      );
    }
    const email = body.email.toLowerCase();
    if (await this._organizationRepository.emailExists(email)) {
      throw new ConflictException(
        'Mit dieser E-Mail gibt es schon einen Login. Melde dich einfach an.'
      );
    }
    if (await this._clipperRepository.pendingApplication(workspace.id, email)) {
      throw new ConflictException(
        'Du hast dich schon beworben. Wir melden uns per WhatsApp bei dir.'
      );
    }

    await this._clipperRepository.createApplication(workspace.id, {
      name: body.name,
      email,
      phone: body.phone,
      age: body.age,
      device: body.device,
      accounts: body.accounts,
      experience: body.experience || null,
      source: body.source || null,
      password: AuthService.hashPassword(body.password),
    });
    return { ok: true };
  }

  async list(orgId: string) {
    return { applications: await this._clipperRepository.applications(orgId) };
  }

  async accept(orgId: string, id: string, accounts: number) {
    const application = await this.pending(orgId, id);
    if (await this._organizationRepository.emailExists(application.email)) {
      throw new ConflictException(
        'Mit dieser E-Mail gibt es schon einen Login'
      );
    }

    const user = await this._organizationRepository.createMember(orgId, {
      email: application.email,
      name: application.name,
      phone: application.phone,
      role: Role.CLIPPER,
      clipperAccounts: accounts,
      // already hashed when applying
      password: application.password,
    });
    await this._clipperRepository.decideApplication(
      orgId,
      id,
      ApplicationStatus.ACCEPTED,
      user.id
    );
    await this._onboardingService.ensureAccounts(orgId, user.id);
    return {
      userId: user.id,
      name: application.name,
      phone: application.phone,
    };
  }

  async decline(orgId: string, id: string) {
    await this.pending(orgId, id);
    await this._clipperRepository.decideApplication(
      orgId,
      id,
      ApplicationStatus.DECLINED
    );
    return { ok: true };
  }

  // A login without a user: tell an applicant where the application stands,
  // but only with the password they applied with
  async loginHint(email: string, password: string) {
    const application = await this._clipperRepository.latestApplication(email);
    if (
      !application ||
      application.status === ApplicationStatus.ACCEPTED ||
      !AuthService.comparePassword(password, application.password)
    ) {
      return null;
    }
    return application.status === ApplicationStatus.PENDING
      ? 'Deine Bewerbung wird noch geprüft. Wir melden uns per WhatsApp, sobald du loslegen kannst.'
      : 'Deine Bewerbung wurde leider abgelehnt.';
  }

  private async pending(orgId: string, id: string) {
    const application = await this._clipperRepository.getApplication(orgId, id);
    if (!application) {
      throw new NotFoundException('Bewerbung nicht gefunden');
    }
    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException(
        'Über diese Bewerbung ist schon entschieden'
      );
    }
    return application;
  }
}
