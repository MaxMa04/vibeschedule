'use client';

import { FC } from 'react';
import {
  EarthIcon,
  MessageSquareIcon,
  MoreHorizontalIcon,
  Repeat2Icon,
  SendIcon,
  ThumbsUpIcon,
} from 'lucide-react';
import { useIntegration } from '@vibeschedule/frontend/components/launches/helpers/use.integration';
import {
  PreviewAvatar,
  PreviewMedia,
  PreviewText,
} from '@vibeschedule/frontend/components/new-launch/providers/general.preview';

export const LinkedinPreview: FC<{ maximumCharacters?: number }> = ({
  maximumCharacters,
}) => {
  const { integration, date } = useIntegration();

  return (
    <div className="flex flex-col gap-3 border-[var(--linkedin-border)] bg-[var(--linkedin-bg)] py-3 text-sm">
      <div className="flex items-start gap-2 px-3">
        <PreviewAvatar className="size-12" />
        <div className="flex min-w-0 flex-1 flex-col text-[var(--linkedin-text)]">
          <span className="truncate font-semibold text-foreground">
            {integration?.name}
          </span>
          {!!integration?.display && (
            <span className="truncate text-xs">{integration.display}</span>
          )}
          <span className="flex items-center gap-1 text-xs">
            {date.format('DD.MM.YYYY, HH:mm')} · <EarthIcon className="size-3" />
          </span>
        </div>
        <MoreHorizontalIcon className="size-5 text-[var(--linkedin-text)]" />
      </div>
      <PreviewText maximumCharacters={maximumCharacters} className="px-3" />
      <PreviewMedia className="max-h-96 w-full" />
      <div className="mx-3 flex justify-around border-t border-[var(--linkedin-border)] pt-2 text-[var(--linkedin-text)] [&_svg]:size-5">
        <ThumbsUpIcon />
        <MessageSquareIcon />
        <Repeat2Icon />
        <SendIcon />
      </div>
    </div>
  );
};
