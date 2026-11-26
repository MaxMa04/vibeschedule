'use client';

import { FC } from 'react';
import {
  BookmarkIcon,
  HeartIcon,
  MessageCircleIcon,
  MoreHorizontalIcon,
  SendIcon,
} from 'lucide-react';
import { useIntegration } from '@vibeschedule/frontend/components/launches/helpers/use.integration';
import {
  PreviewAvatar,
  PreviewMedia,
  PreviewText,
} from '@vibeschedule/frontend/components/new-launch/providers/general.preview';

export const InstagramPreview: FC<{ maximumCharacters?: number }> = ({
  maximumCharacters,
}) => {
  const { integration, value } = useIntegration();
  const hasMedia = !!value[0]?.image?.length;

  return (
    <div className="flex flex-col bg-[var(--instagram-bg)] text-sm">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <PreviewAvatar className="size-8" />
        <span className="flex-1 truncate font-semibold">
          {integration?.name}
        </span>
        <MoreHorizontalIcon className="size-5" />
      </div>
      {hasMedia ? (
        <PreviewMedia className="aspect-[4/5] w-full" />
      ) : (
        <div className="aspect-[4/5] w-full bg-muted" />
      )}
      <div className="flex items-center gap-4 px-3 pt-3 [&_svg]:size-6">
        <HeartIcon />
        <MessageCircleIcon />
        <SendIcon />
        <BookmarkIcon className="ms-auto" />
      </div>
      <PreviewText
        maximumCharacters={maximumCharacters}
        className="px-3 pt-2 pb-3"
        prefix={`<strong class="font-semibold">${integration?.name}</strong> `}
      />
    </div>
  );
};
