'use client';

import { FC } from 'react';
import { SmartphoneIcon } from 'lucide-react';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { Badge } from '@vibeschedule/frontend/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@vibeschedule/frontend/components/ui/tooltip';
import { cn } from '@vibeschedule/frontend/lib/utils';

// a post or channel somebody posts by hand instead of through PfM. `icon`
// drops the word where a row has no room, `inline` also drops the frame for
// calendar chips
export const ManualBadge: FC<{
  variant?: 'default' | 'icon' | 'inline';
  className?: string;
}> = ({ variant = 'default', className }) => {
  const t = useT();
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          variant === 'inline' ? (
            <span
              aria-label={t('manual_badge')}
              className={cn(
                'inline-flex shrink-0 text-muted-foreground',
                className
              )}
            />
          ) : (
            <Badge
              variant="outline"
              aria-label={variant === 'icon' ? t('manual_badge') : undefined}
              className={cn(
                'text-muted-foreground',
                variant === 'icon' && 'px-1.5',
                className
              )}
            />
          )
        }
      >
        <SmartphoneIcon className={variant === 'inline' ? 'size-3' : undefined} />
        {variant === 'default' && t('manual_badge')}
      </TooltipTrigger>
      <TooltipContent>{t('manual_only_tooltip')}</TooltipContent>
    </Tooltip>
  );
};
