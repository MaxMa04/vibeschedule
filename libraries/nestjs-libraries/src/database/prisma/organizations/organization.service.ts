import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { OrganizationRepository } from '@vibeschedule/nestjs-libraries/database/prisma/organizations/organization.repository';
import { AuthService } from '@vibeschedule/helpers/auth/auth.service';
import { AddTeamMemberDto } from '@vibeschedule/nestjs-libraries/dtos/settings/add.team.member.dto';

@Injectable()
export class OrganizationService implements OnApplicationBootstrap {
  private readonly _logger = new Logger(OrganizationService.name);

  constructor(private _organizationRepository: OrganizationRepository) {}

  // There is no sign-up: the first start creates the workspace and its admin
  async onApplicationBootstrap() {
    if (await this._organizationRepository.countUsers()) {
      return;
    }

    const { SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } = process.env;
    if (!SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD) {
      this._logger.warn(
        'No users yet and SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD are not set'
      );
      return;
    }

    await this._organizationRepository.createWorkspace(
      'VibeLabs',
      SEED_ADMIN_EMAIL.toLowerCase(),
      AuthService.hashPassword(SEED_ADMIN_PASSWORD)
    );
    this._logger.log(`Created workspace with admin ${SEED_ADMIN_EMAIL}`);
  }

  getOrgByApiKey(apiKey: string) {
    return this._organizationRepository.getOrgByApiKey(apiKey);
  }

  rotateApiKey(orgId: string) {
    return this._organizationRepository.rotateApiKey(orgId);
  }

  async getTeam(orgId: string) {
    return { users: await this._organizationRepository.getTeam(orgId) };
  }

  async addTeamMember(orgId: string, body: AddTeamMemberDto) {
    const email = body.email.toLowerCase();
    if (await this._organizationRepository.emailExists(email)) {
      throw new ConflictException('Diese E-Mail-Adresse ist schon vergeben');
    }

    return this._organizationRepository.createMember(orgId, {
      email,
      name: body.name,
      role: body.role,
      password: AuthService.hashPassword(body.password),
    });
  }

  async setPassword(orgId: string, userId: string, password: string) {
    await this.getMemberOrThrow(orgId, userId);
    await this._organizationRepository.setPassword(
      userId,
      AuthService.hashPassword(password)
    );
  }

  async deleteTeamMember(orgId: string, currentUserId: string, userId: string) {
    if (userId === currentUserId) {
      throw new BadRequestException('Du kannst dich nicht selbst entfernen');
    }

    await this.getMemberOrThrow(orgId, userId);
    await this._organizationRepository.deleteMember(userId);
  }

  private async getMemberOrThrow(orgId: string, userId: string) {
    const member = await this._organizationRepository.getMember(orgId, userId);
    if (!member) {
      throw new NotFoundException('Nutzer nicht gefunden');
    }
    return member;
  }
}
