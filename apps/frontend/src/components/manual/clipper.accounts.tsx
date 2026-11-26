'use client';

import { FC, useState } from 'react';
import useSWR from 'swr';
import { BookOpenIcon, PlusIcon, TriangleAlertIcon } from 'lucide-react';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import { ChannelAvatar } from '@vibeschedule/frontend/components/launches/channel.avatar';
import { CLIPPER_GUIDE_URL } from '@vibeschedule/frontend/components/clippers/clipper.guide';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@vibeschedule/frontend/components/ui/card';
import { Skeleton } from '@vibeschedule/frontend/components/ui/skeleton';
import { Spinner } from '@vibeschedule/frontend/components/ui/spinner';

interface ClipperChannel {
  id: string;
  name: string;
  picture: string;
  identifier: string;
  disabled: boolean;
}

// A clipper's own accounts with the way to connect another one. The connect
// link carries the clipper, so the account lands here after the consent.
export const ClipperAccounts: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const [connecting, setConnecting] = useState(false);
  const { data } = useSWR('/manual/channels', async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error();
    }
    return (await response.json()).channels as ClipperChannel[];
  });

  const connect = async () => {
    setConnecting(true);
    try {
      const response = await fetch('/manual/connect/tiktok');
      if (!response.ok) {
        throw new Error();
      }
      window.location.href = (await response.json()).url;
    } catch {
      setConnecting(false);
      toaster.show(t('clipper_connect_failed'), 'warning');
    }
  };

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="border-b">
        <CardTitle>{t('clipper_accounts')}</CardTitle>
        <CardDescription>{t('clipper_accounts_description')}</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {!data ? (
          <div className="px-4 py-3">
            <Skeleton className="h-8 w-40" />
          </div>
        ) : !data.length ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">
            {t('clipper_accounts_empty')}
          </p>
        ) : (
          <ul className="divide-y">
            {data.map((channel) => (
              <li key={channel.id} className="flex items-center gap-2.5 px-4 py-3">
                <ChannelAvatar
                  picture={channel.picture}
                  identifier={channel.identifier}
                  name={channel.name}
                />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {channel.name}
                </span>
                {channel.disabled && (
                  <span className="flex shrink-0 items-center gap-1 text-sm text-destructive">
                    <TriangleAlertIcon className="size-4" />
                    {t('clipper_account_disconnected')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <CardFooter className="flex-wrap gap-2 border-t py-3">
        <Button className="h-10 md:h-9" onClick={connect} disabled={connecting}>
          {connecting ? <Spinner data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
          {t('clipper_connect_tiktok')}
        </Button>
        <Button
          variant="ghost"
          className="h-10 md:h-9"
          nativeButton={false}
          render={<a href={CLIPPER_GUIDE_URL} target="_blank" rel="noreferrer" />}
        >
          <BookOpenIcon data-icon="inline-start" />
          {t('clipper_guide')}
        </Button>
      </CardFooter>
    </Card>
  );
};
