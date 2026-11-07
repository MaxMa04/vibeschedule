'use client';

import useSWR from 'swr';
import { useCallback, useMemo, useState } from 'react';
import { orderBy } from 'lodash';
import clsx from 'clsx';
import ImageWithFallback from '@vibeschedule/react/helpers/image.with.fallback';
import SafeImage from '@vibeschedule/react/helpers/safe.image';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { RenderAnalytics } from '@vibeschedule/frontend/components/platform-analytics/render.analytics';
import { Select } from '@vibeschedule/react/form/select';
import { Button } from '@vibeschedule/react/form/button';
import { useRouter } from 'next/navigation';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import useCookie from 'react-use-cookie';
import { LoadingComponent } from '@vibeschedule/frontend/components/layout/loading';
const periods = [7, 30, 90];

export const PlatformAnalytics = () => {
  const fetch = useFetch();
  const t = useT();
  const router = useRouter();

  const [current, setCurrent] = useState(0);
  const [key, setKey] = useState(7);
  const [refresh, setRefresh] = useState(false);
  const [collapseMenu, setCollapseMenu] = useCookie('collapseMenu', '0');
  const load = useCallback(async () => {
    return (await (await fetch('/integrations/list')).json()).integrations;
  }, []);
  const { data, isLoading } = useSWR('analytics-list', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    fallbackData: [],
  });
  const sortedIntegrations = useMemo(() => {
    return orderBy(
      data,
      ['type', 'disabled', 'identifier'],
      ['desc', 'asc', 'asc']
    );
  }, [data]);
  const currentIntegration = useMemo(() => {
    return sortedIntegrations[current];
  }, [current, sortedIntegrations]);
  if (isLoading) {
    return (
      <div className="bg-newBgColorInner p-[20px] flex flex-1 flex-col gap-[15px] transition-all items-center justify-center">
        <LoadingComponent />
      </div>
    );
  }

  if (!sortedIntegrations.length && !isLoading) {
    return (
      <div className="bg-newBgColorInner p-[20px] flex flex-col gap-[20px] transition-all flex-1 justify-center items-center text-center">
        <div className="text-[24px] font-display font-bold tracking-tight">
          {t('can_t_show_analytics_yet')}
        </div>
        <div className="text-[16px] text-textItemBlur">
          {t('you_have_to_add_social_media_channels')}
        </div>
        <Button onClick={() => router.push('/launches')}>
          {t('go_to_the_calendar_to_add_channels')}
        </Button>
      </div>
    );
  }
  return (
    <>
      <div
        className={clsx(
          'bg-newBgColorInner p-[20px] mobile:p-[12px] flex flex-col gap-[15px] transition-all mobile:w-full',
          collapseMenu === '1' ? 'group sidebar w-[100px]' : 'w-[260px]'
        )}
      >
        <div className="flex gap-[12px] flex-col">
          <div className="flex items-center mobile:hidden">
            <h2 className="group-[.sidebar]:hidden flex-1 text-[20px] font-[500]">
              {t('channels')}
            </h2>
            <div
              onClick={() => setCollapseMenu(collapseMenu === '1' ? '0' : '1')}
              className="group-[.sidebar]:rotate-[180deg] group-[.sidebar]:mx-auto text-btnText bg-btnSimple rounded-[6px] w-[24px] h-[24px] flex items-center justify-center cursor-pointer select-none"
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
          <div className="flex gap-[15px] mobile:gap-[12px] flex-col mobile:flex-row mobile:overflow-x-auto mobile:ps-[12px] mobile:pt-[6px] mobile:pb-[6px] scrollbar scrollbar-thumb-fifth scrollbar-track-newBgColor">
            {sortedIntegrations.map((integration, index) => (
              <div
                key={integration.id}
                onClick={() => {
                  setRefresh(true);
                  setTimeout(() => {
                    setRefresh(false);
                  }, 10);
                  setCurrent(index);
                }}
                className={clsx(
                  'flex gap-[12px] items-center group/profile justify-center hover:bg-boxHover rounded-[12px] mobile:shrink-0',
                  currentIntegration.id !== integration.id &&
                    'opacity-20 hover:opacity-100 cursor-pointer'
                )}
              >
                <div
                  className={clsx(
                    'relative rounded-full flex justify-center items-center gap-[6px]',
                    integration.disabled && 'opacity-50'
                  )}
                >
                  <ImageWithFallback
                    fallbackSrc={`/icons/platforms/${integration.identifier}.png`}
                    src={integration.picture}
                    className="rounded-[8px]"
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
                  className={clsx(
                    'flex-1 whitespace-nowrap text-ellipsis overflow-hidden group-[.sidebar]:hidden mobile:hidden',
                    integration.disabled && 'opacity-50'
                  )}
                >
                  {integration.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-newBgColorInner flex-1 flex-col flex p-[20px] mobile:p-[12px] gap-[12px]">
        {!!currentIntegration && (
          <div className="flex-1 flex flex-col gap-[14px]">
            <div className="max-w-[200px]">
              <Select
                label=""
                name="date"
                disableForm={true}
                hideErrors={true}
                onChange={(e) => setKey(+e.target.value)}
              >
                {periods.map((days) => (
                  <option key={days} value={days}>
                    {t('last_days', { days })}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex-1">
              {!refresh && (
                <RenderAnalytics
                  url={`/analytics/${currentIntegration.id}?date=${key}`}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
