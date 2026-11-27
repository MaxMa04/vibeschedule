'use client';

import { FC } from 'react';
import { BoxIcon, ChevronDownIcon, UserRoundIcon } from 'lucide-react';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { useOnboarding } from '@vibeschedule/frontend/components/onboarding/use.onboarding';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@vibeschedule/frontend/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@vibeschedule/frontend/components/ui/collapsible';

// The brief of each app the clipper runs accounts for, and who looks after
// them. Open on the start page; on the posting page it folds away, since
// the clipper reads it there every day.
export const ClipperBriefs: FC<{ collapsible?: boolean }> = ({
  collapsible,
}) => {
  const t = useT();
  const { data } = useOnboarding();
  const apps = (data?.apps || []).filter((app) => app.brief);
  if (!data || (!apps.length && !data.manager)) {
    return null;
  }

  const body = (
    <div className="flex flex-col divide-y">
      {apps.map((app) => (
        <section key={app.id} className="flex flex-col gap-1 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <BoxIcon className="size-4 text-muted-foreground" />
            {app.name}
          </h3>
          <p className="text-sm whitespace-pre-line text-muted-foreground">
            {app.brief}
          </p>
        </section>
      ))}
      {data.manager && (
        <p className="flex items-center gap-2 px-4 py-3 text-sm">
          <UserRoundIcon className="size-4 text-muted-foreground" />
          {t('brief_manager', { name: data.manager.name })}
        </p>
      )}
    </div>
  );

  const title = apps.length
    ? t('brief_title', { count: apps.length })
    : t('brief_contact');

  if (collapsible) {
    return (
      <Collapsible>
        <Card className="gap-0 py-0">
          <CollapsibleTrigger className="group flex min-h-12 items-center justify-between gap-3 px-4 py-3 text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <span className="flex min-w-0 flex-col">
              <span className="font-medium">{title}</span>
              {!!apps.length && (
                <span className="truncate text-sm text-muted-foreground">
                  {apps.map((app) => app.name).join(', ')}
                </span>
              )}
            </span>
            <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t">{body}</CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="border-b">
        <CardTitle>{title}</CardTitle>
        {!!apps.length && (
          <CardDescription>{t('brief_description')}</CardDescription>
        )}
      </CardHeader>
      {body}
    </Card>
  );
};
