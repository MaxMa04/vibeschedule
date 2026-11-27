'use client';

import { FC, useState } from 'react';
import { ListTodoIcon } from 'lucide-react';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import {
  openTaskCount,
  visibleTasks,
} from '@vibeschedule/helpers/clippers/clipper.tasks';
import { responseMessage } from '@vibeschedule/frontend/lib/response-message';
import { useOnboarding } from '@vibeschedule/frontend/components/onboarding/use.onboarding';
import { Profile } from '@vibeschedule/frontend/components/onboarding/clipper.profile';
import { ChannelAvatar } from '@vibeschedule/frontend/components/launches/channel.avatar';
import type {
  ClipperTask,
  OnboardingAccount,
  OnboardingState,
} from '@vibeschedule/frontend/components/clippers/clipper.types';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@vibeschedule/frontend/components/ui/card';
import { Checkbox } from '@vibeschedule/frontend/components/ui/checkbox';
import { cn } from '@vibeschedule/frontend/lib/utils';

// The tasks we gave, for one account or in general, as a checklist. Ticked
// off today stays visible (struck through) so a wrong tap can be taken back.
const TaskChecklist: FC<{
  tasks: ClipperTask[];
  /** the account of the tasks, shows the profile of a profile task */
  account?: OnboardingAccount;
  today: string;
  onChange: (state: OnboardingState) => void;
  className?: string;
}> = ({ tasks: all, account, today, onChange, className }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const [busy, setBusy] = useState<string | null>(null);
  const tasks = visibleTasks(all, today);

  const check = async (id: string, done: boolean) => {
    setBusy(id);
    const response = await fetch(`/onboarding/tasks/${id}`, {
      method: 'POST',
      body: JSON.stringify({ done }),
    });
    setBusy(null);
    if (!response.ok) {
      toaster.show(
        (await responseMessage(response)) || t('tasks_check_failed'),
        'warning'
      );
      return;
    }
    onChange(await response.json());
  };

  if (!tasks.length) {
    return null;
  }

  return (
    <ul className={cn('flex flex-col', className)}>
      {tasks.map((task) => {
        const done = !!task.doneDay;
        const id = `task-${task.id}`;
        return (
          <li
            key={task.id}
            className="flex flex-col gap-3 border-b py-3 last:border-b-0"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center">
                <Checkbox
                  id={id}
                  className="size-5"
                  checked={done}
                  disabled={busy === task.id}
                  onCheckedChange={(checked) => check(task.id, !!checked)}
                />
              </span>
              <label htmlFor={id} className="flex min-w-0 flex-1 flex-col">
                <span
                  className={cn(
                    'font-medium',
                    done && 'font-normal text-muted-foreground line-through'
                  )}
                >
                  {task.title}
                </span>
                {task.description && !done && (
                  <span className="text-sm whitespace-pre-line text-muted-foreground">
                    {task.description}
                  </span>
                )}
              </label>
            </div>
            {task.kind === 'PROFILE' && !done && account && (
              <div className="ps-9">
                <Profile account={account} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export const AccountTasks: FC<{
  account: OnboardingAccount;
  today: string;
  onChange: (state: OnboardingState) => void;
  className?: string;
}> = ({ account, ...props }) => (
  <TaskChecklist tasks={account.tasks} account={account} {...props} />
);

// On the posting page: what is still to do, in general and on the clipper's
// accounts, also on accounts that already run. The start page shows the
// account tasks on each account, so there only the general ones (generalOnly).
export const ClipperTasks: FC<{ generalOnly?: boolean }> = ({
  generalOnly,
}) => {
  const t = useT();
  const { data, mutate } = useOnboarding();
  if (!data) {
    return null;
  }
  const accounts = generalOnly
    ? []
    : data.accounts.filter(
        (account) => visibleTasks(account.tasks, data.today).length
      );
  const general = visibleTasks(data.tasks, data.today);
  if (!accounts.length && !general.length) {
    return null;
  }
  const open =
    openTaskCount(data.tasks) +
    accounts.reduce((sum, account) => sum + account.openTasks, 0);
  const onChange = (state: OnboardingState) =>
    mutate(state, { revalidate: false });

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <ListTodoIcon className="size-4" />
            {t('tasks_title')}
          </span>
          <span className="text-sm font-normal text-muted-foreground tabular-nums">
            {open ? t('tasks_open_count', { count: open }) : t('tasks_all_done')}
          </span>
        </CardTitle>
        <CardDescription>{t('tasks_description')}</CardDescription>
      </CardHeader>
      <div className="divide-y">
        {!!general.length && (
          <section className="flex flex-col px-4 pt-3">
            <h3 className="text-sm font-medium">{t('tasks_general')}</h3>
            <TaskChecklist
              tasks={data.tasks}
              today={data.today}
              onChange={onChange}
            />
          </section>
        )}
        {accounts.map((account) => (
          <section key={account.id} className="flex flex-col px-4 pt-3">
            <h3 className="flex min-w-0 items-center gap-2 text-sm font-medium">
              {account.channel && (
                <ChannelAvatar
                  size="xs"
                  picture={account.channel.picture}
                  identifier="tiktok"
                  name={account.channel.name}
                />
              )}
              <span className="truncate">
                {account.channel?.name ||
                  t('start_account', { number: account.position + 1 })}
              </span>
            </h3>
            <AccountTasks
              account={account}
              today={data.today}
              onChange={onChange}
            />
          </section>
        ))}
      </div>
    </Card>
  );
};
