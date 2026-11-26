'use client';

import { FC, ReactNode } from 'react';
import {
  BookmarkIcon,
  HeartIcon,
  MessageCircleIcon,
  Music2Icon,
  ShareIcon,
} from 'lucide-react';
import { useIntegration } from '@vibeschedule/frontend/components/launches/helpers/use.integration';
import {
  PreviewAvatar,
  PreviewMedia,
  PreviewText,
} from '@vibeschedule/frontend/components/new-launch/providers/general.preview';

const Action: FC<{ icon: ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex flex-col items-center gap-0.5 text-xs font-semibold">
    {icon}
    {label}
  </div>
);

export const TiktokPreview: FC<{ maximumCharacters?: number }> = ({
  maximumCharacters,
}) => {
  const { integration } = useIntegration();

  return (
    <div className="flex justify-center bg-[var(--tiktok-item-bg)] p-4">
      <div className="relative aspect-[9/16] w-full max-w-72 overflow-hidden rounded-xl bg-black text-white shadow-sm">
        <PreviewMedia className="absolute inset-0 bg-black" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute end-2 bottom-20 flex flex-col items-center gap-4 [&_svg]:size-7 [&_svg]:fill-white/90 [&_svg]:stroke-none">
          <PreviewAvatar className="size-10 ring-2 ring-white" />
          <Action icon={<HeartIcon />} label="1,3 Mio." />
          <Action icon={<MessageCircleIcon />} label="10,7K" />
          <Action icon={<BookmarkIcon />} label="1,2K" />
          <Action icon={<ShareIcon className="stroke-white!" />} label="1,2K" />
        </div>
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-3 pe-16 text-sm">
          <div className="font-semibold">@{integration?.name}</div>
          <PreviewText
            maximumCharacters={maximumCharacters}
            className="line-clamp-4 text-sm"
          />
          <div className="flex items-center gap-1 text-xs opacity-90">
            <Music2Icon className="size-3" />
            <span className="truncate">{integration?.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
