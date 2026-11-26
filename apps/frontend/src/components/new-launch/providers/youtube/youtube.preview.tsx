'use client';

import { FC } from 'react';
import { useWatch } from 'react-hook-form';
import { PlayIcon, ThumbsDownIcon, ThumbsUpIcon } from 'lucide-react';
import { useIntegration } from '@vibeschedule/frontend/components/launches/helpers/use.integration';
import {
  PreviewAvatar,
  PreviewMedia,
  PreviewText,
} from '@vibeschedule/frontend/components/new-launch/providers/general.preview';

export const YoutubePreview: FC<{ maximumCharacters?: number }> = ({
  maximumCharacters,
}) => {
  const { integration, value } = useIntegration();
  const title = useWatch({ name: 'title' });
  const hasMedia = !!value[0]?.image?.length;

  return (
    <div className="flex flex-col gap-3 bg-[var(--youtube-bg)] p-3 text-sm">
      {hasMedia ? (
        <PreviewMedia className="aspect-video w-full rounded-xl bg-black" />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <PlayIcon className="size-10" />
        </div>
      )}
      {!!title && (
        <div className="line-clamp-2 text-base font-semibold">{title}</div>
      )}
      <div className="flex items-center gap-2">
        <PreviewAvatar className="size-9" />
        <span className="flex-1 truncate font-semibold">
          {integration?.name}
        </span>
        <div className="flex items-center gap-3 rounded-full bg-[var(--youtube-action-color)] px-3 py-1.5 [&_svg]:size-4">
          <ThumbsUpIcon />
          <ThumbsDownIcon />
        </div>
      </div>
      <PreviewText
        maximumCharacters={maximumCharacters}
        className="rounded-xl bg-[var(--youtube-action-color)] p-3"
      />
    </div>
  );
};
