'use client';

import { FC } from 'react';
import { cn } from '@vibeschedule/frontend/lib/utils';

export const VideoFrame: FC<{
  url: string;
  autoplay?: boolean;
  controls?: boolean;
  className?: string;
}> = (props) => {
  const { url, autoplay, controls, className } = props;
  return (
    <video
      className={cn('size-full object-cover', className)}
      src={url + '#t=0.1'}
      preload="metadata"
      autoPlay={!!autoplay}
      controls={!!controls}
      playsInline={true}
    />
  );
};
