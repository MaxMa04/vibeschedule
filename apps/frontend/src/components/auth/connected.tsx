'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CircleCheckIcon, CircleXIcon, LogInIcon } from 'lucide-react';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@vibeschedule/frontend/components/ui/card';
import { cn } from '@vibeschedule/frontend/lib/utils';

// Where somebody without a login lands after connecting an account, e.g. a
// clipper who opened the connect link an admin sent
export function Connected() {
  const t = useT();
  const returnUrl = useSearchParams().get('returnUrl') || '';
  const failed = /[?&]isSuccess=false/.test(returnUrl);
  const Icon = failed ? CircleXIcon : CircleCheckIcon;

  return (
    <Card>
      <CardHeader className="text-center">
        <div
          className={cn(
            'mx-auto mb-2 flex size-12 items-center justify-center rounded-full',
            failed ? 'bg-destructive/10 text-destructive' : 'bg-muted'
          )}
        >
          <Icon className="size-6" />
        </div>
        <CardTitle className="text-lg font-semibold">
          {failed ? t('account_connect_failed') : t('account_connected')}
        </CardTitle>
        <CardDescription>
          {failed
            ? t('account_connect_failed_hint')
            : t('account_connected_hint')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          className="h-auto min-h-10 w-full py-2 whitespace-normal"
          nativeButton={false}
          render={
            <Link
              href={`/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`}
            />
          }
        >
          <LogInIcon data-icon="inline-start" />
          {t('account_connected_login')}
        </Button>
      </CardContent>
    </Card>
  );
}
