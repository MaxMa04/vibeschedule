'use client';

import { FC } from 'react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@vibeschedule/frontend/components/ui/avatar';
import { cn } from '@vibeschedule/frontend/lib/utils';

const sizes = {
  xs: { avatar: 'size-5', badge: 'size-2.5 -right-0.5 -bottom-0.5' },
  sm: { avatar: 'size-7', badge: 'size-3.5 -right-0.5 -bottom-0.5' },
  md: { avatar: 'size-9', badge: 'size-4 -right-1 -bottom-1' },
};

// a channel picture with the platform logo in the corner
export const ChannelAvatar: FC<{
  picture?: string | null;
  identifier?: string | null;
  name?: string | null;
  size?: keyof typeof sizes;
  disabled?: boolean;
  className?: string;
}> = ({ picture, identifier, name, size = 'sm', disabled, className }) => {
  const s = sizes[size];
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0',
        disabled && 'opacity-50 grayscale',
        className
      )}
    >
      <Avatar className={s.avatar}>
        <AvatarImage src={picture || '/no-picture.jpg'} alt={name || ''} />
        <AvatarFallback className="text-xs">
          {(name || '?').slice(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      {!!identifier && (
        <img
          src={`/icons/platforms/${identifier}.png`}
          alt=""
          className={cn(
            'absolute rounded-full bg-background ring-2 ring-background',
            s.badge
          )}
        />
      )}
    </span>
  );
};
