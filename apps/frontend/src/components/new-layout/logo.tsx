import { FC } from 'react';
import clsx from 'clsx';

export const Logo: FC<{ size?: number; className?: string }> = ({
  size = 44,
  className,
}) => {
  return (
    <>
      <img
        src="/brand/mark-light.png"
        alt="vibeschedule"
        width={size}
        height={size}
        className={clsx('rounded-[12px] dark:hidden', className)}
      />
      <img
        src="/brand/mark-dark.png"
        alt="vibeschedule"
        width={size}
        height={size}
        className={clsx('rounded-[12px] hidden dark:block', className)}
      />
    </>
  );
};

export const Wordmark: FC<{ className?: string }> = ({ className }) => {
  return (
    <span
      className={clsx(
        'font-display font-bold tracking-tight text-newTextColor',
        className
      )}
    >
      vibeschedule
    </span>
  );
};
