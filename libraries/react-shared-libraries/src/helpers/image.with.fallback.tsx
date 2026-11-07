import { FC, useEffect, useState } from 'react';
import SafeImage from './safe.image';

interface ImageSrc {
  src?: string | null;
  fallbackSrc: string;
  width: number;
  height: number;
  [key: string]: any;
}

const ImageWithFallback: FC<ImageSrc> = (props) => {
  const { src, fallbackSrc, ...rest } = props;
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);
  useEffect(() => {
    setImgSrc(src || fallbackSrc);
  }, [src]);
  return (
    <SafeImage
      alt=""
      {...rest}
      src={imgSrc}
      onError={() => {
        setImgSrc(fallbackSrc);
      }}
    />
  );
};

export default ImageWithFallback;
