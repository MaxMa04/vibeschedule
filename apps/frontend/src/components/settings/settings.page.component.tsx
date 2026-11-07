'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useUser } from '@vibeschedule/frontend/components/layout/user.context';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { UsersComponent } from '@vibeschedule/frontend/components/settings/users.component';
import { ApiKeyComponent } from '@vibeschedule/frontend/components/settings/api-key.component';
import { ChangePasswordComponent } from '@vibeschedule/frontend/components/settings/change-password.component';

type Tab = 'users' | 'api_key' | 'password';

export const SettingsPage = () => {
  const user = useUser();
  const t = useT();
  const isAdmin = user?.role === 'ADMIN' || !!user?.isAdmin;

  const tabs = useMemo(
    () => [
      ...(isAdmin
        ? [
            { tab: 'users' as Tab, label: t('settings_tab_users') },
            { tab: 'api_key' as Tab, label: t('label_api_key') },
          ]
        : []),
      { tab: 'password' as Tab, label: t('change_password') },
    ],
    [isAdmin, t]
  );

  const [selected, setSelected] = useState<Tab>();
  const tab = tabs.some((p) => p.tab === selected) ? selected : tabs[0].tab;

  return (
    <>
      <div className="bg-newBgColorInner p-[20px] mobile:p-[12px] flex flex-col gap-[8px] w-[260px] mobile:w-full mobile:flex-row mobile:overflow-x-auto">
        {tabs.map((p) => (
          <button
            key={p.tab}
            type="button"
            onClick={() => setSelected(p.tab)}
            className={clsx(
              'h-[40px] px-[12px] rounded-[12px] text-start text-[14px] mobile:shrink-0 mobile:whitespace-nowrap transition-colors',
              p.tab === tab
                ? 'bg-boxHover text-newTextColor font-[600]'
                : 'text-textItemBlur hover:bg-boxHover hover:text-newTextColor'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="bg-newBgColorInner flex-1 min-w-0 flex flex-col p-[20px] mobile:p-[12px]">
        {tab === 'users' && <UsersComponent />}
        {tab === 'api_key' && <ApiKeyComponent />}
        {tab === 'password' && <ChangePasswordComponent />}
      </div>
    </>
  );
};
