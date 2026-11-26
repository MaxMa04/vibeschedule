'use client';

import { FC } from 'react';
import { useWatch } from 'react-hook-form';
import { useIntegration } from '@vibeschedule/frontend/components/launches/helpers/use.integration';
import {
  PreviewAvatar,
  PreviewMedia,
  PreviewText,
} from '@vibeschedule/frontend/components/new-launch/providers/general.preview';

export const PinterestPreview: FC<{ maximumCharacters?: number }> = ({
  maximumCharacters,
}) => {
  const { integration, value } = useIntegration();
  const title = useWatch({ name: 'title' });
  const link = useWatch({ name: 'link' });
  const hasMedia = !!value[0]?.image?.length;

  return (
    <div className="flex flex-col gap-3 p-3 text-sm">
      {hasMedia ? (
        <PreviewMedia className="max-h-[32rem] w-full rounded-2xl" />
      ) : (
        <div className="aspect-[2/3] w-full rounded-2xl bg-muted" />
      )}
      {!!link && (
        <span className="truncate text-xs text-muted-foreground underline">
          {link}
        </span>
      )}
      {!!title && <div className="text-lg font-semibold">{title}</div>}
      <PreviewText maximumCharacters={maximumCharacters} />
      <div className="flex items-center gap-2">
        <PreviewAvatar className="size-8" />
        <span className="truncate font-medium">{integration?.name}</span>
      </div>
    </div>
  );
};
