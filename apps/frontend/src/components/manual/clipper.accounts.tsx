'use client';

import { FC } from 'react';
import useSWR from 'swr';
import { BookOpenIcon, ListChecksIcon, TriangleAlertIcon } from 'lucide-react';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import {
  onboardingProgress,
  useOnboarding,
} from '@vibeschedule/frontend/components/onboarding/clipper.start';
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
import { Progress } from '@vibeschedule/frontend/components/ui/progress';
import { Skeleton } from '@vibeschedule/frontend/components/ui/skeleton';

interface ClipperChannel {
  id: string;
  name: string;
  picture: string;
  identifier: string;
  disabled: boolean;
}

// Until a clipper has set everything up, the posting page leads to the start
export const ClipperStartBanner: FC = () => {
  const t = useT();
  const { data } = useOnboarding();
  if (!data || data.done) {
    return null;
  }
  const progress = onboardingProgress(data);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('start_banner_title')}</CardTitle>
        <CardDescription>{t('start_banner_text')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex justify-end text-sm text-muted-foreground tabular-nums">
          {t('start_progress_count', progress)}
        </div>
        <Progress value={(progress.done / progress.total) * 100} />
      </CardContent>
      <CardFooter>
        <Button
          className="h-10 md:h-9"
          nativeButton={false}
          render={<a href="/start" />}
        >
          <ListChecksIcon data-icon="inline-start" />
          {t('start_banner_button')}
        </Button>
      </CardFooter>
    </Card>
  );
};

// A clipper's own accounts. New accounts are created, warmed up and
// connected on the start page (/start), one by one.
export const ClipperAccounts: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const { data } = useSWR('/manual/channels', async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error();
    }
    return (await response.json()) as {
      channels: ClipperChannel[];
      // agreed with a clipper, null for the team
      maxAccounts: number | null;
    };
  });
  const connected = data?.channels.filter((c) => !c.disabled).length ?? 0;

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="border-b">
        <CardTitle className="flex items-baseline justify-between gap-3">
          {t('clipper_accounts')}
          {data && data.maxAccounts !== null && (
            <span className="shrink-0 text-sm font-normal text-muted-foreground tabular-nums">
              {t('clipper_accounts_count', {
                connected,
                max: data.maxAccounts,
              })}
            </span>
          )}
        </CardTitle>
        <CardDescription>{t('clipper_accounts_description')}</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {!data ? (
          <div className="px-4 py-3">
            <Skeleton className="h-8 w-40" />
          </div>
        ) : !data.channels.length ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">
            {t('clipper_accounts_empty')}
          </p>
        ) : (
          <ul className="divide-y">
            {data.channels.map((channel) => (
              <li
                key={channel.id}
                className="flex items-center gap-2.5 px-4 py-3"
              >
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
        <Button
          className="h-10 md:h-9"
          nativeButton={false}
          render={<a href="/start" />}
        >
          <ListChecksIcon data-icon="inline-start" />
          {t('start_nav')}
        </Button>
        <Button
          variant="ghost"
          className="h-10 md:h-9"
          nativeButton={false}
          render={
            <a href={CLIPPER_GUIDE_URL} target="_blank" rel="noreferrer" />
          }
        >
          <BookOpenIcon data-icon="inline-start" />
          {t('clipper_guide')}
        </Button>
      </CardFooter>
    </Card>
  );
};
