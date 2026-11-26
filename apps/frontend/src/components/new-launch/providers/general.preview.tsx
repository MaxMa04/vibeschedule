'use client';

import { FC } from 'react';
import { useIntegration } from '@vibeschedule/frontend/components/launches/helpers/use.integration';
import { textSlicer } from '@vibeschedule/helpers/utils/count.length';
import { stripHtmlValidation } from '@vibeschedule/helpers/utils/strip.html.validation';
import { VideoOrImage } from '@vibeschedule/react/helpers/video.or.image';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { cn } from '@vibeschedule/frontend/lib/utils';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@vibeschedule/frontend/components/ui/avatar';

// the post text as preview html, the part over the channel limit is marked
export const usePreviewHtml = (maximumCharacters?: number) => {
  const { value, integration } = useIntegration();
  const t = useT();
  const content = stripHtmlValidation('normal', value[0]?.content || '', true);
  const { start, end } = textSlicer(
    integration?.identifier || '',
    maximumCharacters || 10000,
    content
  );
  const cropped = content.slice(end);
  return (
    content.slice(start, end) +
    (cropped
      ? `<mark class="rounded-sm bg-destructive/15 text-destructive" title="${t(
          'text_will_be_cropped'
        )}">${cropped}</mark>`
      : '')
  );
};

export const PreviewText: FC<{
  maximumCharacters?: number;
  className?: string;
  prefix?: string;
}> = ({ maximumCharacters, className, prefix = '' }) => {
  const html = usePreviewHtml(maximumCharacters);
  return (
    <div
      dir="auto"
      className={cn('break-words whitespace-pre-line', className)}
      dangerouslySetInnerHTML={{ __html: prefix + html }}
    />
  );
};

export const PreviewAvatar: FC<{ className?: string }> = ({ className }) => {
  const { integration } = useIntegration();
  return (
    <Avatar className={className}>
      <AvatarImage src={integration?.picture || '/no-picture.jpg'} alt="" />
      <AvatarFallback>{integration?.name?.slice(0, 1)}</AvatarFallback>
    </Avatar>
  );
};

export const PreviewMedia: FC<{ className?: string }> = ({ className }) => {
  const { value } = useIntegration();
  const media = value[0]?.image?.[0];
  if (!media) {
    return null;
  }

  return (
    <div className={cn('flex overflow-hidden bg-muted', className)}>
      <VideoOrImage autoplay={true} src={media.path} />
    </div>
  );
};

// for platforms without their own look (X, Threads, Bluesky)
export const GeneralPreview: FC<{ maximumCharacters?: number }> = ({
  maximumCharacters,
}) => {
  const { integration, value } = useIntegration();
  const extra = (value[0]?.image?.length || 0) - 1;

  return (
    <div className="flex gap-3 p-4 text-sm">
      <PreviewAvatar className="size-10" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate font-semibold">{integration?.name}</span>
          {!!integration?.display && (
            <span className="truncate text-muted-foreground">
              {integration.display}
            </span>
          )}
        </div>
        <PreviewText maximumCharacters={maximumCharacters} />
        <div className="relative">
          <PreviewMedia className="max-h-96 rounded-xl border" />
          {extra > 0 && (
            <span className="absolute end-2 bottom-2 rounded-md bg-background/80 px-1.5 py-0.5 text-xs font-medium">
              +{extra}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
