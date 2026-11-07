import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { PostsService } from '@vibeschedule/nestjs-libraries/database/prisma/posts/posts.service';
import {
  PfmClient,
  PfmPostResult,
} from '@vibeschedule/nestjs-libraries/integrations/pfm.client';

@Controller('/public/pfm')
export class PfmWebhookController {
  private readonly _logger = new Logger(PfmWebhookController.name);

  constructor(
    private _postsService: PostsService,
    private _pfmClient: PfmClient
  ) {}

  // PfM retries anything but a 2xx for a day, so a failure to apply the
  // result is logged and the reconcile on the next calendar load catches up
  @Post('/webhook')
  @HttpCode(200)
  async webhook(
    @Headers('post-for-me-webhook-secret') secret: string,
    @Body() body: { event_type: string; data: PfmPostResult }
  ) {
    if (!(await this._pfmClient.isWebhookSecret(secret))) {
      throw new UnauthorizedException();
    }

    if (body?.event_type === 'social.post.result.created') {
      try {
        await this._postsService.applyWebhookResult(body.data);
      } catch (err) {
        this._logger.error(
          `PfM result for ${body.data?.post_id} failed: ${err}`
        );
      }
    }

    return { received: true };
  }
}
