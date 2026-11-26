'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@vibeschedule/frontend/components/layout/user.context';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import {
  PageBody,
  PageHeader,
} from '@vibeschedule/frontend/components/layout/page-header';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@vibeschedule/frontend/components/ui/tabs';
import { ProfileComponent } from '@vibeschedule/frontend/components/settings/profile.component';
import { UsersComponent } from '@vibeschedule/frontend/components/settings/users.component';
import { ApiKeyComponent } from '@vibeschedule/frontend/components/settings/api-key.component';
import { ChangePasswordComponent } from '@vibeschedule/frontend/components/settings/change-password.component';

type Tab = 'profile' | 'users' | 'api_key' | 'password';

export const SettingsPage = () => {
  const user = useUser();
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const isAdmin = user?.role === 'ADMIN' || !!user?.isAdmin;

  const tabs = useMemo(
    () => [
      { tab: 'profile' as Tab, label: t('settings_tab_profile') },
      ...(isAdmin
        ? [
            { tab: 'users' as Tab, label: t('settings_tab_users') },
            { tab: 'api_key' as Tab, label: t('label_api_key') },
          ]
        : []),
      { tab: 'password' as Tab, label: t('settings_tab_password') },
    ],
    [isAdmin, t]
  );

  const requested = params.get('tab');
  const tab = tabs.find((p) => p.tab === requested)?.tab || tabs[0].tab;

  const select = useCallback(
    (value: Tab) => {
      const next = new URLSearchParams(params.toString());
      next.set('tab', value);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router]
  );

  return (
    <PageBody className="max-w-4xl">
      <PageHeader
        title={t('settings')}
        description={t('settings_description')}
      />
      <Tabs value={tab} onValueChange={(value) => select(value as Tab)}>
        <TabsList className="max-w-full">
          {tabs.map((p) => (
            <TabsTrigger key={p.tab} value={p.tab} className="px-2.5 sm:px-3">
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="profile" className="pt-2">
          <ProfileComponent />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="users" className="pt-2">
            <UsersComponent />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="api_key" className="pt-2">
            <ApiKeyComponent />
          </TabsContent>
        )}
        <TabsContent value="password" className="pt-2">
          <ChangePasswordComponent />
        </TabsContent>
      </Tabs>
    </PageBody>
  );
};
