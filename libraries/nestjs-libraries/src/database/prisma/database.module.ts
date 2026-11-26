import { Global, Module } from '@nestjs/common';
import { PrismaRepository, PrismaService } from './prisma.service';
import { OrganizationRepository } from '@vibeschedule/nestjs-libraries/database/prisma/organizations/organization.repository';
import { OrganizationService } from '@vibeschedule/nestjs-libraries/database/prisma/organizations/organization.service';
import { UsersService } from '@vibeschedule/nestjs-libraries/database/prisma/users/users.service';
import { UsersRepository } from '@vibeschedule/nestjs-libraries/database/prisma/users/users.repository';
import { IntegrationService } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/integration.service';
import { IntegrationRepository } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/integration.repository';
import { PostsService } from '@vibeschedule/nestjs-libraries/database/prisma/posts/posts.service';
import { PostsRepository } from '@vibeschedule/nestjs-libraries/database/prisma/posts/posts.repository';
import { ManualPostsService } from '@vibeschedule/nestjs-libraries/database/prisma/posts/manual.posts.service';
import { MediaService } from '@vibeschedule/nestjs-libraries/database/prisma/media/media.service';
import { MediaRepository } from '@vibeschedule/nestjs-libraries/database/prisma/media/media.repository';
import { FormatsService } from '@vibeschedule/nestjs-libraries/database/prisma/formats/formats.service';
import { FormatsRepository } from '@vibeschedule/nestjs-libraries/database/prisma/formats/formats.repository';
import { ChannelUsersService } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/channel.users.service';
import { ClipperPayService } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/clipper.pay.service';
import { ClipperRepository } from '@vibeschedule/nestjs-libraries/database/prisma/clippers/clipper.repository';
import { ClipperOnboardingService } from '@vibeschedule/nestjs-libraries/database/prisma/clippers/clipper.onboarding.service';
import { ClipperApplicationsService } from '@vibeschedule/nestjs-libraries/database/prisma/clippers/clipper.applications.service';
import { PfmClient } from '@vibeschedule/nestjs-libraries/integrations/pfm.client';

@Global()
@Module({
  providers: [
    PrismaService,
    PrismaRepository,
    UsersService,
    UsersRepository,
    OrganizationService,
    OrganizationRepository,
    IntegrationService,
    IntegrationRepository,
    ChannelUsersService,
    ClipperPayService,
    ClipperRepository,
    ClipperOnboardingService,
    ClipperApplicationsService,
    PostsService,
    PostsRepository,
    ManualPostsService,
    MediaService,
    MediaRepository,
    FormatsService,
    FormatsRepository,
    PfmClient,
  ],
  get exports() {
    return this.providers;
  },
})
export class DatabaseModule {}
