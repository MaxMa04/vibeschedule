'use client';

import { useEffect } from 'react';
import { RotateCwIcon, TriangleAlertIcon } from 'lucide-react';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@vibeschedule/frontend/components/ui/empty';
import { PageBody } from '@vibeschedule/frontend/components/layout/page-header';
import { reloadForStaleBuild } from '@vibeschedule/frontend/lib/stale-build';

// Errors of a page stay inside the app shell, the sidebar keeps working
export default function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  useEffect(() => {
    if (!reloadForStaleBuild(error)) {
      console.error(error);
    }
  }, [error]);

  return (
    <PageBody>
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlertIcon />
          </EmptyMedia>
          <EmptyTitle>{t('page_error_title')}</EmptyTitle>
          <EmptyDescription>{t('page_error_description')}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center">
          <Button onClick={reset}>
            <RotateCwIcon data-icon="inline-start" />
            {t('page_error_retry')}
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            {t('page_error_reload')}
          </Button>
        </EmptyContent>
      </Empty>
    </PageBody>
  );
}
