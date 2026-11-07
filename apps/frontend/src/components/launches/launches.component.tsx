'use client';

import { AddProviderButton } from '@vibeschedule/frontend/components/launches/add.provider.component';
import { FC, useCallback, useMemo, useState } from 'react';
import SafeImage from '@vibeschedule/react/helpers/safe.image';
import { groupBy, orderBy } from 'lodash';
import { CalendarWeekProvider } from '@vibeschedule/frontend/components/launches/calendar.context';
import { Filters } from '@vibeschedule/frontend/components/launches/filters';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { LoadingComponent } from '@vibeschedule/frontend/components/layout/loading';
import clsx from 'clsx';
import { Menu } from '@vibeschedule/frontend/components/launches/menu/menu';
import { Integration } from '@prisma/client';
import ImageWithFallback from '@vibeschedule/react/helpers/image.with.fallback';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import { Calendar } from './calendar';
import { useDrag, useDrop } from 'react-dnd';
import { DNDProvider } from '@vibeschedule/frontend/components/launches/helpers/dnd.provider';
import { NewPost } from '@vibeschedule/frontend/components/launches/new.post';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { useIntegrationList } from '@vibeschedule/frontend/components/launches/helpers/use.integration.list';
import useCookie from 'react-use-cookie';
import { useModals } from '@vibeschedule/frontend/components/layout/new-modal';
import { Input } from '@vibeschedule/react/form/input';
import { Button } from '@vibeschedule/react/form/button';

interface MenuComponentInterface {
  collapsed: boolean;
  mutate: (shouldReload?: boolean) => void;
  update: (shouldReload: boolean) => void;
}
export const OpenClose: FC<{
  isOpen: boolean;
}> = (props) => {
  const { isOpen } = props;
  return (
    <svg
      width="11"
      height="6"
      viewBox="0 0 22 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx(
        'rotate-180 transition-all',
        isOpen ? 'rotate-180' : 'rotate-90'
      )}
    >
      <path
        d="M21.9245 11.3823C21.8489 11.5651 21.7207 11.7213 21.5563 11.8312C21.3919 11.9411 21.1986 11.9998 21.0008 11.9998H1.00079C0.802892 12 0.609399 11.9414 0.444805 11.8315C0.280212 11.7217 0.151917 11.5654 0.076165 11.3826C0.000412494 11.1998 -0.0193921 10.9986 0.0192583 10.8045C0.0579087 10.6104 0.153276 10.4322 0.293288 10.2923L10.2933 0.29231C10.3862 0.199333 10.4964 0.125575 10.6178 0.0752506C10.7392 0.0249263 10.8694 -0.000976562 11.0008 -0.000976562C11.1322 -0.000976562 11.2623 0.0249263 11.3837 0.0752506C11.5051 0.125575 11.6154 0.199333 11.7083 0.29231L21.7083 10.2923C21.8481 10.4322 21.9433 10.6105 21.9818 10.8045C22.0202 10.9985 22.0003 11.1996 21.9245 11.3823Z"
        fill="currentColor"
      />
    </svg>
  );
};
const EditGroupNameModal: FC<{
  name: string;
  id: string;
  close: () => void;
  resolve: (value: string) => void;
}> = (props) => {
  const t = useT();
  const { close, name, id, resolve } = props;
  const fetch = useFetch();
  const toaster = useToaster();
  const [groupName, setGroupName] = useState<string>(name);
  const save = useCallback(async () => {
    const response = await fetch(`/integrations/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: groupName }),
    });
    if (!response.ok) {
      const { message } = await response.json().catch(() => ({} as any));
      toaster.show(
        (Array.isArray(message) ? message[0] : message) ||
          t('could_not_save_group'),
        'warning'
      );
      return;
    }
    resolve(groupName);
    close();
  }, [groupName, id]);
  return (
    <div>
      <Input
        name="name"
        disableForm={true}
        label={t('group_name')}
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
      />
      <Button onClick={save} className="mt-[16px]">
        {t('save')}
      </Button>
    </div>
  );
};

const EditPencil = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const MenuGroupComponent: FC<
  MenuComponentInterface & {
    changeItemGroup: (id: string, group: string) => void;
    group: {
      id: string;
      name: string;
      values: Array<
        Integration & {
          identifier: string;
        }
      >;
    };
  }
> = (props) => {
  const { group, mutate, update, changeItemGroup, collapsed } = props;
  const t = useT();
  const modals = useModals();
  const toaster = useToaster();
  const [isOpen, setIsOpen] = useState(
    !!+(localStorage.getItem(group.name + '_isOpen') || '1')
  );
  const editGroupName = useCallback(
    async (e: any) => {
      e.stopPropagation();
      const val: string | undefined = await new Promise((resolve) => {
        modals.openModal({
          title: t('edit_group_name'),
          onClose: () => resolve(undefined),
          children: (close) => (
            <EditGroupNameModal
              name={group.name}
              id={group.id}
              close={close}
              resolve={resolve}
            />
          ),
        });
      });
      if (!val) {
        return;
      }
      await mutate();
      toaster.show(t('group_updated'), 'success');
    },
    [group.name, group.id, mutate, modals, t]
  );
  const changeOpenClose = useCallback(
    (e: any) => {
      setIsOpen(!isOpen);
      localStorage.setItem(group.name + '_isOpen', isOpen ? '0' : '1');
      e.stopPropagation();
    },
    [isOpen]
  );
  const [collectedProps, drop] = useDrop(() => ({
    accept: 'menu',
    drop: (
      item: {
        id: string;
      },
      monitor
    ) => {
      changeItemGroup(item.id, group.id);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));
  return (
    <div
      className="gap-[16px] flex flex-col relative"
      // @ts-ignore
      ref={drop}
    >
      {collectedProps.isOver && (
        <div className="absolute start-0 top-0 w-full h-full pointer-events-none">
          <div className="w-full h-full start-0 top-0 relative">
            <div className="bg-white/30 w-full h-full p-[8px] box-content rounded-md" />
          </div>
        </div>
      )}
      {!!group.name && (
        <div
          className="flex items-center gap-[5px] cursor-pointer group"
          onClick={changeOpenClose}
        >
          <div>
            <OpenClose isOpen={isOpen} />
          </div>
          <div
            className="line-clamp-1"
            {...(collapsed
              ? {
                  'data-tooltip-id': 'tooltip',
                  'data-tooltip-content': group.name,
                }
              : {})}
          >
            {group.name}
          </div>
          {!collapsed && (
            <div
              className="hidden group-hover:block hover:opacity-70"
              onClick={editGroupName}
            >
              <EditPencil />
            </div>
          )}
        </div>
      )}
      <div
        className={clsx(
          'gap-[12px] flex flex-col relative',
          !isOpen && 'hidden'
        )}
      >
        {group.values.map((integration) => (
          <MenuComponent
            collapsed={collapsed}
            key={integration.id}
            integration={integration}
            mutate={mutate}
            update={update}
          />
        ))}
      </div>
    </div>
  );
};
export const MenuComponent: FC<
  MenuComponentInterface & {
    integration: Integration & {
      identifier: string;
    };
  }
> = (props) => {
  const { mutate, update, integration, collapsed } = props;
  const [collected, drag, dragPreview] = useDrag(() => ({
    type: 'menu',
    item: {
      id: integration.id,
    },
  }));
  return (
    <div
      // @ts-ignore
      ref={dragPreview}
      {...(collapsed
        ? {
            'data-tooltip-id': 'tooltip',
            'data-tooltip-content': integration.name,
          }
        : {})}
      className="flex gap-[12px] items-center bg-newBgColorInner hover:bg-boxHover group/profile transition-all rounded-[12px]"
    >
      <div
        className={clsx(
          'relative gap-[6px] flex justify-center items-center',
          integration.disabled && 'opacity-50'
        )}
      >
        <ImageWithFallback
          fallbackSrc={'/no-picture.jpg'}
          src={integration.picture || '/no-picture.jpg'}
          className="rounded-[8px] min-w-[36px] min-h-[36px]"
          alt={integration.identifier}
          width={36}
          height={36}
        />
        <SafeImage
          src={`/icons/platforms/${integration.identifier}.png`}
          className="rounded-[8px] absolute z-10 bottom-[5px] -end-[5px] border border-fifth"
          alt={integration.identifier}
          width={18.41}
          height={18.41}
        />
      </div>
      <div
        // @ts-ignore
        ref={drag}
        role="Handle"
        className={clsx(
          'group-[.sidebar]:hidden flex-1 whitespace-nowrap text-ellipsis overflow-hidden cursor-move',
          integration.disabled && 'opacity-50'
        )}
      >
        {integration.name}
      </div>
      <Menu
        mutate={mutate}
        onChange={update}
        id={integration.id}
        canEnable={integration.disabled}
        canDisable={!integration.disabled}
      />
    </div>
  );
};
export const LaunchesComponent = () => {
  const fetch = useFetch();
  const t = useT();
  const [reload, setReload] = useState(false);
  const [collapseMenu, setCollapseMenu] = useCookie('collapseMenu', '0');
  const [channelsOpen, setChannelsOpen] = useState(false);
  const [mode] = useCookie('mode', 'light');
  const { isLoading, data: integrations, mutate } = useIntegrationList();

  const changeItemGroup = useCallback(
    async (id: string, group: string) => {
      mutate(
        integrations.map((integration: any) => {
          if (integration.id === id) {
            return {
              ...integration,
              customer: {
                id: group,
              },
            };
          }
          return integration;
        }),
        false
      );
      await fetch(`/integrations/${id}/group`, {
        method: 'PUT',
        body: JSON.stringify({
          group,
        }),
      });
      mutate();
    },
    [integrations]
  );
  const sortedIntegrations = useMemo(() => {
    return orderBy(
      integrations,
      ['type', 'disabled', 'identifier'],
      ['desc', 'asc', 'asc']
    );
  }, [integrations]);
  const menuIntegrations = useMemo(() => {
    return orderBy(
      Object.values(
        groupBy(sortedIntegrations, (o) => o?.customer?.id || '')
      ).map((p) => ({
        name: (p[0].customer?.name || '') as string,
        id: (p[0].customer?.id || '') as string,
        isEmpty: p.length === 0,
        values: orderBy(
          p,
          ['type', 'disabled', 'identifier'],
          ['desc', 'asc', 'asc']
        ),
      })),
      ['isEmpty', 'name'],
      ['desc', 'asc']
    );
  }, [sortedIntegrations]);
  const update = useCallback(async (shouldReload: boolean) => {
    if (shouldReload) {
      setReload(true);
    }
    await mutate();
    if (shouldReload) {
      setReload(false);
    }
  }, []);
  if (isLoading || reload) {
    return (
      <div className="bg-newBgColorInner p-[20px] flex flex-1 flex-col gap-[15px] transition-all items-center justify-center">
        <LoadingComponent />
      </div>
    );
  }

  return (
    <DNDProvider>
      <CalendarWeekProvider integrations={sortedIntegrations}>
        {channelsOpen && (
          <div
            className="hidden mobile:block fixed inset-0 bg-newBackdrop opacity-60 z-[149]"
            onClick={() => setChannelsOpen(false)}
          />
        )}
        <div
          className={clsx(
            'flex relative flex-col',
            collapseMenu === '1' && !channelsOpen
              ? 'group sidebar w-[100px]'
              : 'w-[260px]',
            channelsOpen
              ? 'mobile:fixed mobile:inset-x-0 mobile:bottom-0 mobile:z-[150] mobile:w-full mobile:max-h-[80vh] mobile:rounded-t-[16px] mobile:overflow-hidden'
              : 'mobile:hidden'
          )}
        >
          <div
            className={clsx(
              'bg-newBgColorInner p-[20px] flex flex-col gap-[15px] transition-all absolute start-0 top-0 w-full h-full mobile:static mobile:h-auto mobile:max-h-[80vh] mobile:pb-[80px] overflow-x-hidden overflow-y-auto scrollbar scrollbar-thumb-fifth scrollbar-track-newBgColor'
            )}
          >
            <div className="flex items-center">
              <h2 className="group-[.sidebar]:hidden flex-1 text-[20px] font-[500]">
                {t('channels')}
              </h2>
              <div
                onClick={() => setChannelsOpen(false)}
                className="hidden mobile:flex text-btnText bg-btnSimple rounded-[6px] w-[28px] h-[28px] items-center justify-center cursor-pointer select-none"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                >
                  <path
                    d="M1 1L11 11M11 1L1 11"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div
                onClick={() =>
                  setCollapseMenu(collapseMenu === '1' ? '0' : '1')
                }
                className="group-[.sidebar]:rotate-[180deg] group-[.sidebar]:mx-auto mobile:hidden text-btnText bg-btnSimple rounded-[6px] w-[24px] h-[24px] flex items-center justify-center cursor-pointer select-none"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="7"
                  height="13"
                  viewBox="0 0 7 13"
                  fill="none"
                >
                  <path
                    d="M6 11.5L1 6.5L6 1.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
            <div className="flex flex-col gap-[8px] group-[.sidebar]:mx-auto group-[.sidebar]:w-[44px]">
              <AddProviderButton update={() => update(false)} />
              {sortedIntegrations?.length > 0 && (
                <div className="flex gap-[8px] group-[.sidebar]:flex-col mobile:hidden">
                  <NewPost />
                </div>
              )}
            </div>
            <div className="gap-[32px] flex flex-col select-none flex-1">
              {sortedIntegrations.length === 0 &&
                (collapseMenu === '0' || channelsOpen) && (
                  <div className="flex-1 max-h-[500px] justify-center items-center flex">
                    <div className="flex flex-col gap-[12px] text-center">
                      <img
                        src={
                          mode === 'dark'
                            ? '/no-channels.svg'
                            : '/no-channels-colors.svg'
                        }
                        alt=""
                        className="mx-auto min-w-[100%]"
                      />
                      <div className="font-[600] text-[20px]">
                        {t('no_channels')}
                      </div>
                      <div className="text-[14px]">
                        {t('connect_your_accounts')}
                      </div>
                    </div>
                  </div>
                )}
              {menuIntegrations.map((menu) => (
                <MenuGroupComponent
                  collapsed={collapseMenu === '1' && !channelsOpen}
                  changeItemGroup={changeItemGroup}
                  key={menu.name}
                  group={menu}
                  mutate={mutate}
                  update={update}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="bg-newBgColorInner flex-1 min-w-0 flex-col flex p-[20px] mobile:p-[12px] gap-[12px] mobile:min-h-[600px]">
          <div className="hidden mobile:flex gap-[8px]">
            <div
              onClick={() => setChannelsOpen(true)}
              className="cursor-pointer h-[44px] px-[12px] bg-btnSimple text-btnText rounded-[8px] flex items-center gap-[8px] select-none"
            >
              <div className="flex -space-x-[10px]">
                {sortedIntegrations.slice(0, 3).map((integration: any) => (
                  <ImageWithFallback
                    key={integration.id}
                    fallbackSrc={`/icons/platforms/${integration.identifier}.png`}
                    src={integration.picture}
                    className="rounded-full border-2 border-btnSimple"
                    alt={integration.identifier}
                    width={24}
                    height={24}
                  />
                ))}
              </div>
              <div className="text-[14px] font-[500]">
                {sortedIntegrations.length || t('channels')}
              </div>
            </div>
            {sortedIntegrations?.length > 0 ? (
              <NewPost />
            ) : (
              <div className="flex-1">
                <AddProviderButton update={() => update(false)} />
              </div>
            )}
          </div>
          <Filters />
          <div className="flex-1 flex">
            <Calendar />
          </div>
        </div>
      </CalendarWeekProvider>
    </DNDProvider>
  );
};
