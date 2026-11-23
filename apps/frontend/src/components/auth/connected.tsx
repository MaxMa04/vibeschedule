'use client';

import { useSearchParams } from 'next/navigation';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';

// Where somebody without a login lands after connecting an account, e.g. a
// clipper who opened the connect link an admin sent
export function Connected() {
  const t = useT();
  const returnUrl = useSearchParams().get('returnUrl') || '';
  const failed = /[?&]isSuccess=false/.test(returnUrl);

  return (
    <div className="flex flex-col gap-[16px]">
      <h1 className="text-[28px] font-display font-bold tracking-tight">
        {failed ? t('account_connect_failed') : t('account_connected')}
      </h1>
      <div className="text-[15px] text-textItemBlur">
        {failed
          ? t('account_connect_failed_hint')
          : t('account_connected_hint')}
      </div>
      <a
        href={`/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`}
        className="text-[14px] text-teal underline"
      >
        {t('account_connected_login')}
      </a>
    </div>
  );
}
