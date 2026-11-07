'use client';

import { useCallback, useState } from 'react';
import { useSWRConfig } from 'swr';
import copy from 'copy-to-clipboard';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useUser } from '@vibeschedule/frontend/components/layout/user.context';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import { useVariables } from '@vibeschedule/react/helpers/variable.context';
import { deleteDialog } from '@vibeschedule/react/helpers/delete.dialog';
import { Button } from '@vibeschedule/react/form/button';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';

export const ApiKeyComponent = () => {
  const user = useUser();
  const fetch = useFetch();
  const toaster = useToaster();
  const { backendUrl } = useVariables();
  const { mutate } = useSWRConfig();
  const t = useT();
  const [visible, setVisible] = useState(false);
  const [rotating, setRotating] = useState(false);
  const apiKey = user?.publicApi || user?.apiKey || '';
  const shownKey = visible ? apiKey : '•'.repeat(32);

  const commands = (key: string) =>
    `export VIBESCHEDULE_API_URL=${backendUrl}\nexport VIBESCHEDULE_API_KEY=${key}\nvibeschedule --help`;

  const copyText = useCallback(
    (text: string, message: string) => () => {
      copy(text);
      toaster.show(message);
    },
    [toaster]
  );

  const rotate = useCallback(async () => {
    if (
      !(await deleteDialog(
        t('rotate_api_key_confirm'),
        t('rotate_api_key'),
        t('rotate_api_key'),
        t('cancel'),
        true
      ))
    ) {
      return;
    }
    setRotating(true);
    const response = await fetch('/user/api-key/rotate', { method: 'POST' });
    setRotating(false);
    if (!response.ok) {
      toaster.show(t('api_key_rotate_failed'), 'warning');
      return;
    }
    await mutate('/user/self');
    toaster.show(t('api_key_rotated'));
  }, [fetch, mutate, t, toaster]);

  return (
    <div className="flex flex-col gap-[16px] max-w-[640px]">
      <div className="flex flex-col gap-[4px]">
        <h3 className="text-[20px] font-[600]">{t('label_api_key')}</h3>
        <div className="text-[14px] text-textItemBlur">
          {t('api_key_description')}
        </div>
      </div>
      <div className="flex flex-col gap-[16px] rounded-[20px] border border-newBorder p-[24px]">
        {apiKey ? (
          <div className="flex gap-[8px] mobile:flex-col">
            <div className="flex-1 min-w-0 h-[40px] px-[16px] flex items-center rounded-[12px] border border-newTableBorder font-mono text-[14px] overflow-x-auto whitespace-nowrap">
              {shownKey}
            </div>
            <div className="flex gap-[8px]">
              <Button secondary={true} onClick={() => setVisible(!visible)}>
                {visible ? t('hide') : t('reveal')}
              </Button>
              <Button
                secondary={true}
                onClick={copyText(apiKey, t('api_key_copied'))}
              >
                {t('copy')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-[14px] text-textItemBlur">{t('no_api_key')}</div>
        )}
        <div className="flex">
          <Button loading={rotating} onClick={rotate}>
            {t('rotate_api_key')}
          </Button>
        </div>
      </div>
      {!!apiKey && (
        <div className="flex flex-col gap-[12px] rounded-[20px] border border-newBorder p-[24px]">
          <div className="flex items-center gap-[12px]">
            <div className="flex-1 text-[16px] font-[600]">
              {t('cli_title')}
            </div>
            <Button
              secondary={true}
              onClick={copyText(commands(apiKey), t('commands_copied'))}
            >
              {t('copy_commands')}
            </Button>
          </div>
          <div className="text-[14px] text-textItemBlur">
            {t('cli_description')}
          </div>
          <pre className="rounded-[12px] bg-newBgColor p-[16px] text-[13px] font-mono overflow-x-auto whitespace-pre">
            {commands(shownKey)}
          </pre>
        </div>
      )}
    </div>
  );
};
