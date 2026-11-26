'use client';

import { FC } from 'react';
import {
  EarthIcon,
  MessageCircleIcon,
  MoreHorizontalIcon,
  Share2Icon,
  ThumbsUpIcon,
} from 'lucide-react';
import { useIntegration } from '@vibeschedule/frontend/components/launches/helpers/use.integration';
import {
  PreviewAvatar,
  PreviewMedia,
  PreviewText,
} from '@vibeschedule/frontend/components/new-launch/providers/general.preview';

export const FacebookPreview: FC<{ maximumCharacters?: number }> = ({
  maximumCharacters,
}) => {
  const { integration, date } = useIntegration();

  return (
    <div className="flex flex-col gap-3 bg-[var(--facebook-bg)] py-3 text-sm">
      <div className="flex items-center gap-2 px-3">
        <PreviewAvatar className="size-9" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold">{integration?.name}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {date.format('DD.MM.YYYY, HH:mm')} · <EarthIcon className="size-3" />
          </span>
        </div>
        <MoreHorizontalIcon className="size-5 text-muted-foreground" />
      </div>
      <PreviewText maximumCharacters={maximumCharacters} className="px-3" />
      <PreviewMedia className="max-h-96 w-full" />
      <div className="mx-3 flex justify-around border-t pt-2 text-muted-foreground [&_svg]:size-5">
        <ThumbsUpIcon />
        <MessageCircleIcon />
        <Share2Icon />
      </div>
    </div>
  );
};
