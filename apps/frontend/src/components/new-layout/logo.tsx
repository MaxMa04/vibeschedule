import { FC } from 'react';
import { cn } from '@vibeschedule/frontend/lib/utils';

export const Logo: FC<{ size?: number; className?: string }> = ({
  size = 44,
  className,
}) => (
  <>
    <img
      src="/brand/mark-light.png"
      alt="vibeschedule"
      width={size}
      height={size}
      className={cn('rounded-xl dark:hidden', className)}
    />
    <img
      src="/brand/mark-dark.png"
      alt="vibeschedule"
      width={size}
      height={size}
      className={cn('hidden rounded-xl dark:block', className)}
    />
  </>
);
