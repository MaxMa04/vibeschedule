'use client';

import { useEffect } from 'react';
import { reloadForStaleBuild } from '@vibeschedule/frontend/lib/stale-build';
import { geist } from '@vibeschedule/frontend/fonts/fonts';
import { cn } from '@vibeschedule/frontend/lib/utils';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import '../globals.css';

// Last resort when the root layout itself fails
export default function GlobalError({ error }: { error: Error }) {
  const t = useT();
  useEffect(() => {
    if (!reloadForStaleBuild(error)) {
      console.error(error);
    }
  }, [error]);

  return (
    <html lang="de" className={cn('font-sans antialiased', geist.variable)}>
      <body className="flex min-h-svh items-center justify-center bg-background p-6 text-foreground">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <h1 className="text-lg font-semibold">{t('page_error_title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('page_error_description')}
          </p>
          <Button onClick={() => window.location.reload()}>
            {t('page_error_reload')}
          </Button>
        </div>
      </body>
    </html>
  );
}
