'use client';

import { useEffect, useState } from 'react';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';

export interface ManualMedia {
  index: number;
  type: 'image' | 'video';
  // 01.jpg, 02.jpg, ... the order of the slides
  name: string;
}

export interface LoadedMedia extends ManualMedia {
  file: File;
  url: string;
}

// The slides or the video of a manual post as files in memory. Sharing files
// has to start right inside the tap, so they are loaded before the button
// works. `failed` is set when a file could not be loaded.
export const useManualMedia = (postId: string, media: ManualMedia[]) => {
  const fetch = useFetch();
  const [loaded, setLoaded] = useState<LoadedMedia[]>([]);
  const [failed, setFailed] = useState(false);
  const key = `${postId}:${media.map((m) => m.name).join(',')}`;

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    setLoaded([]);
    setFailed(false);

    (async () => {
      for (const item of media) {
        const response = await fetch(
          `/manual/posts/${postId}/media/${item.index}`
        );
        if (!response.ok) {
          throw new Error(`media ${item.index}: ${response.status}`);
        }
        const blob = await response.blob();
        if (cancelled) {
          return;
        }
        const file = new File([blob], item.name, { type: blob.type });
        const url = URL.createObjectURL(file);
        urls.push(url);
        setLoaded((current) => [...current, { ...item, file, url }]);
      }
    })().catch(() => !cancelled && setFailed(true));

    return () => {
      cancelled = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [key]);

  return { loaded, failed, ready: loaded.length === media.length };
};
