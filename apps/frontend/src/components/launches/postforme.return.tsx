'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TriangleAlertIcon } from 'lucide-react';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { Logo } from '@vibeschedule/frontend/components/new-layout/logo';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@vibeschedule/frontend/components/ui/card';
import { Spinner } from '@vibeschedule/frontend/components/ui/spinner';

// PfM sends the browser here after the OAuth consent of a channel
export const PostForMeReturn = () => {
  const fetch = useFetch();
  const router = useRouter();
  const t = useT();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch('/integrations/sync', { method: 'POST' })
      .then((res) => {
        if (!res.ok) {
          throw new Error();
        }
        router.replace('/launches');
      })
      .catch(() => setFailed(true));
  }, []);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <div className="mx-auto mb-2">
          <Logo size={48} />
        </div>
        <CardTitle>
          {failed ? t('channel_sync_failed') : t('channel_sync_running')}
        </CardTitle>
        <CardDescription>
          {failed
            ? t('calendar_connect_failed_hint')
            : t('calendar_connect_running_hint')}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        {failed ? (
          <Button
            className="h-10 md:h-9"
            nativeButton={false}
            render={<Link href="/launches" />}
          >
            <TriangleAlertIcon data-icon="inline-start" />
            {t('back_to_calendar')}
          </Button>
        ) : (
          <Spinner className="size-6 text-muted-foreground" />
        )}
      </CardContent>
    </Card>
  );
};
