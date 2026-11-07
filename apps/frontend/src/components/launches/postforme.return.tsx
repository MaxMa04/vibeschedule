'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { Logo } from '@vibeschedule/frontend/components/new-layout/logo';

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
    <div className="flex flex-col items-center gap-[16px] text-center p-[24px]">
      <Logo size={56} />
      {failed ? (
        <>
          <div className="text-[18px]">{t('channel_sync_failed')}</div>
          <a href="/launches" className="text-teal underline">
            {t('back_to_calendar')}
          </a>
        </>
      ) : (
        <div className="text-[18px]">{t('channel_sync_running')}</div>
      )}
    </div>
  );
};
