'use client';

import { FC } from 'react';
import { Spinner } from '@vibeschedule/frontend/components/ui/spinner';

export const LoadingComponent: FC<{
  width?: number;
  height?: number;
}> = () => {
  return (
    <div className="flex flex-1 justify-center pt-24 text-muted-foreground">
      <Spinner className="size-8" />
    </div>
  );
};
