import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IntegrationRepository } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/integration.repository';
import { IntegrationTimeDto } from '@vibeschedule/nestjs-libraries/dtos/integrations/integration.time.dto';
import {
  PfmClient,
  PfmFeedPost,
} from '@vibeschedule/nestjs-libraries/integrations/pfm.client';
import {
  AnalyticsData,
  getPfmPlatform,
  PfmPlatform,
  pfmPlatforms,
} from '@vibeschedule/nestjs-libraries/integrations/pfm.platforms';
import {
  targetConstructorToSchema,
  validationMetadatasToSchemas,
} from 'class-validator-jsonschema';
import { ValidationTypes } from 'class-validator';
import { ClassConstructor } from 'class-transformer';
// @ts-ignore no types for the cjs entry
import { defaultMetadataStorage } from 'class-transformer/cjs/storage';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { get, uniq } from 'lodash';

dayjs.extend(utc);

// feed pages for one analytics request, Facebook caps a page at 10 posts
const MAX_FEED_PAGES = 20;

@Injectable()
export class IntegrationService {
  constructor(
    private _integrationRepository: IntegrationRepository,
    private _pfmClient: PfmClient
  ) {}

  catalogue() {
    return {
      social: pfmPlatforms.map((p) => ({
        name: p.name,
        identifier: p.identifier,
        editor: 'normal',
        isExternal: false,
        isWeb3: false,
        ...(p.customFields ? { customFields: p.customFields } : {}),
      })),
    };
  }

  async getConnectUrl(
    orgId: string,
    identifier: string,
    fields: Record<string, string>
  ) {
    const platform = getPfmPlatform(identifier);
    if (!platform) {
      throw new BadRequestException('Unbekannte Plattform');
    }

    return {
      url: await this._pfmClient.authUrl(
        identifier,
        orgId,
        platform.platformData?.(fields)
      ),
    };
  }

  // Mirrors the connected PfM accounts into the channels of the workspace
  async sync(orgId: string) {
    const accounts = (await this._pfmClient.connectedAccounts()).filter((a) =>
      getPfmPlatform(a.platform)
    );
    const known = new Set(
      (await this._integrationRepository.getInternalIds(orgId))
        .filter((i) => !i.deletedAt)
        .map((i) => i.internalId)
    );

    for (const account of accounts) {
      await this._integrationRepository.upsertFromPfm(orgId, account);
    }

    return {
      total: accounts.length,
      added: accounts.filter((a) => !known.has(a.id)).length,
      disabled: await this._integrationRepository.disableMissing(
        orgId,
        accounts.map((a) => a.id)
      ),
    };
  }

  // the channels as the calendar and the editor show them
  async getChannelList(orgId: string) {
    return (await this._integrationRepository.getIntegrationsList(orgId)).map(
      (p) => {
        const platform = getPfmPlatform(p.providerIdentifier);
        return {
          name: p.customName || p.name,
          originalName: p.name,
          id: p.id,
          internalId: p.internalId,
          disabled: p.disabled,
          editor: 'normal',
          picture: p.picture || '/no-picture.jpg',
          identifier: p.providerIdentifier,
          isCustomFields: !!platform?.customFields,
          ...(platform?.customFields
            ? { customFields: platform.customFields }
            : {}),
          display: p.profile,
          time: JSON.parse(p.postingTimes),
          customer: p.customer,
          additionalSettings: p.additionalSettings || '[]',
        };
      }
    );
  }

  getIntegrationsList(org: string) {
    return this._integrationRepository.getIntegrationsList(org);
  }

  getIntegrationById(org: string, id: string) {
    return this._integrationRepository.getIntegrationById(org, id);
  }

  setTimes(orgId: string, integrationId: string, times: IntegrationTimeDto) {
    return this._integrationRepository.setTimes(orgId, integrationId, times);
  }

  updateProviderSettings(org: string, id: string, additionalSettings: string) {
    return this._integrationRepository.updateProviderSettings(
      org,
      id,
      additionalSettings
    );
  }

  updateCustomName(org: string, id: string, name: string) {
    return this._integrationRepository.updateCustomName(org, id, name);
  }

  async updateIntegrationGroup(org: string, id: string, group: string) {
    if (group && !(await this._integrationRepository.getCustomer(org, group))) {
      throw new NotFoundException('Kunde nicht gefunden');
    }
    return this._integrationRepository.updateIntegrationGroup(org, id, group);
  }

  updateOnCustomerName(org: string, id: string, name: string) {
    return this._integrationRepository.updateOnCustomerName(org, id, name);
  }

  customers(orgId: string) {
    return this._integrationRepository.customers(orgId);
  }

  async updateCustomerName(orgId: string, id: string, name: string) {
    const exists = await this._integrationRepository.getCustomerByName(
      orgId,
      name
    );
    if (exists && exists.id !== id) {
      throw new BadRequestException('Diesen Kunden gibt es schon');
    }
    return this._integrationRepository.updateCustomerName(orgId, id, name);
  }

  setDisabled(org: string, id: string, disabled: boolean) {
    return this._integrationRepository.setDisabled(org, id, disabled);
  }

  getPostGroupsForChannel(org: string, id: string) {
    return this._integrationRepository.getPostGroupsForChannel(org, id);
  }

  async disconnectChannel(org: string, id: string) {
    const integration = await this.getIntegrationOrThrow(org, id);
    await this._pfmClient.disconnectAccount(integration.internalId);
  }

  deleteChannel(org: string, id: string) {
    return this._integrationRepository.deleteChannel(org, id);
  }

  async findFreeDateTime(orgId: string, integrationId?: string) {
    const rows = await this._integrationRepository.getPostingTimes(
      orgId,
      integrationId
    );
    return uniq(
      rows.flatMap((row) =>
        (JSON.parse(row.postingTimes) as { time: number }[]).map((p) => p.time)
      )
    );
  }

  // The JSON schema of the platform settings, for the CLI
  async getSettingsSchema(org: string, id: string) {
    const integration = await this.getIntegrationOrThrow(org, id);
    const platform = getPfmPlatform(integration.providerIdentifier)!;
    return {
      maxLength: platform.maxLength,
      settings: platform.dto
        ? validationMetadatasToSchemas({
            classTransformerMetadataStorage: defaultMetadataStorage,
            additionalConverters: {
              // inline nested classes (YouTube tags, Instagram collaborators)
              [ValidationTypes.NESTED_VALIDATION]: (meta, options) => {
                const typeMeta =
                  options.classTransformerMetadataStorage?.findTypeMetadata(
                    meta.target as ClassConstructor<unknown>,
                    meta.propertyName
                  );
                return typeMeta
                  ? targetConstructorToSchema(typeMeta.typeFunction(), options)
                  : {};
              },
            },
          })[platform.dto.name]
        : 'No additional settings required',
    };
  }

  // Daily totals of every metric the platform reports, from the PfM feed of
  // the posts published in the last `days` days
  async analytics(org: string, id: string, days: number) {
    const integration = await this.getIntegrationOrThrow(org, id);
    const platform = getPfmPlatform(integration.providerIdentifier)!;
    const since = dayjs
      .utc()
      .subtract(days - 1, 'day')
      .startOf('day');

    const posts: PfmFeedPost[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < MAX_FEED_PAGES; page++) {
      const { data, meta } = await this._pfmClient.feed(
        integration.internalId,
        {
          cursor,
          limit: 50,
        }
      );
      posts.push(
        ...data.filter(
          (p) => p.posted_at && !dayjs.utc(p.posted_at).isBefore(since)
        )
      );
      // the feed is newest first (a pinned post aside), so a page that ends
      // before the range ends the paging
      const last = data.filter((p) => p.posted_at).pop();
      if (!meta.next || (last && dayjs.utc(last.posted_at).isBefore(since))) {
        break;
      }
      cursor = meta.cursor;
    }

    const dates = Array.from({ length: days }, (_, i) =>
      since.add(i, 'day').format('YYYY-MM-DD')
    );
    return this.metricsToAnalytics(platform, posts, dates, (post) =>
      dayjs.utc(post.posted_at).format('YYYY-MM-DD')
    );
  }

  metricsToAnalytics(
    platform: PfmPlatform,
    posts: PfmFeedPost[],
    dates: string[],
    dateOf: (post: PfmFeedPost) => string
  ): AnalyticsData[] {
    return platform.metrics
      .filter(({ path }) =>
        posts.some((p) => typeof get(p.metrics, path) === 'number')
      )
      .map(({ path, label }) => {
        const totals = dates.map((date) =>
          posts
            .filter((p) => dateOf(p) === date)
            .reduce((sum, p) => sum + (Number(get(p.metrics, path)) || 0), 0)
        );
        const half = Math.floor(totals.length / 2);
        const before = totals.slice(0, half).reduce((a, b) => a + b, 0);
        const after = totals.slice(half).reduce((a, b) => a + b, 0);
        return {
          label,
          data: dates.map((date, i) => ({ date, total: String(totals[i]) })),
          percentageChange: before
            ? Math.round(((after - before) / before) * 100)
            : 0,
        };
      });
  }

  private async getIntegrationOrThrow(org: string, id: string) {
    const integration = await this.getIntegrationById(org, id);
    if (!integration) {
      throw new NotFoundException('Kanal nicht gefunden');
    }
    return integration;
  }
}
