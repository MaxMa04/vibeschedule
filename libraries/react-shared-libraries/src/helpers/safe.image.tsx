'use client';

import { FC, ImgHTMLAttributes } from 'react';

type SafeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string;
};

const SafeImage: FC<SafeImageProps> = ({ alt, ...props }) => {
  return <img alt={alt || ''} {...props} />;
};

export default SafeImage;
