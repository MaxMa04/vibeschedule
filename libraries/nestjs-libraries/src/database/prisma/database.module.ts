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
import { MediaService } from '@vibeschedule/nestjs-libraries/database/prisma/media/media.service';
import { MediaRepository } from '@vibeschedule/nestjs-libraries/database/prisma/media/media.repository';
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
    PostsService,
    PostsRepository,
    MediaService,
    MediaRepository,
    PfmClient,
  ],
  get exports() {
    return this.providers;
  },
})
export class DatabaseModule {}
