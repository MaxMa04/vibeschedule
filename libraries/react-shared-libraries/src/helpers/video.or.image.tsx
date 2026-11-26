import { FC } from 'react';
import { cn } from '@vibeschedule/frontend/lib/utils';
import { hasExtension } from '@vibeschedule/helpers/utils/has.extension';
export const VideoOrImage: FC<{
  src: string;
  autoplay: boolean;
  isContain?: boolean;
  imageClassName?: string;
  videoClassName?: string;
}> = (props) => {
  const { src, autoplay, isContain, imageClassName, videoClassName } = props;
  if (hasExtension(src, 'mp4')) {
    return (
      <video
        src={src}
        autoPlay={autoplay}
        className={cn('size-full', videoClassName)}
        muted={true}
        loop={true}
      />
    );
  }
  return (
    <img
      className={cn(
        isContain ? 'object-contain' : 'object-cover',
        'size-full',
        imageClassName
      )}
      src={src}
    />
  );
};
