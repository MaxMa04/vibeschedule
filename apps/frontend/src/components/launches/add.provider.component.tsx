'use client';

import { useModals } from '@vibeschedule/frontend/components/layout/new-modal';
import React, { FC, useCallback, useMemo, useState } from 'react';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { Input } from '@vibeschedule/react/form/input';
import { FieldValues, FormProvider, useForm } from 'react-hook-form';
import { Button } from '@vibeschedule/react/form/button';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import { object, string } from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';

interface CustomField {
  key: string;
  label: string;
  defaultValue?: string;
  validation: string;
  type: 'text' | 'password';
  hint?: string;
}

interface SocialProvider {
  identifier: string;
  name: string;
  toolTip?: string;
  customFields?: CustomField[];
}

// PfM returns the browser to /integrations/social/postforme after the consent
const useConnect = () => {
  const fetch = useFetch();
  const toaster = useToaster();
  const t = useT();
  return useCallback(async (identifier: string, fields?: FieldValues) => {
    const query = fields
      ? `?code=${encodeURIComponent(
          Buffer.from(JSON.stringify(fields)).toString('base64')
        )}`
      : '';
    const response = await fetch(`/integrations/social/${identifier}${query}`);
    const { url } = await response.json().catch(() => ({}));
    if (!response.ok || !url) {
      toaster.show(t('could_not_connect_to_platform'), 'warning');
      return;
    }
    window.location.href = url;
  }, []);
};

export const useAddProvider = () => {
  const modal = useModals();
  const fetch = useFetch();
  const t = useT();
  return useCallback(async () => {
    const data = await (await fetch('/integrations')).json();
    modal.openModal({
      title: t('add_channel'),
      withCloseButton: true,
      children: <AddProviderComponent social={data.social} />,
    });
  }, []);
};

export const AddProviderButton: FC<{
  update: () => void;
}> = ({ update }) => {
  const add = useAddProvider();
  const fetch = useFetch();
  const toaster = useToaster();
  const t = useT();
  const [syncing, setSyncing] = useState(false);

  const sync = useCallback(async () => {
    setSyncing(true);
    const response = await fetch('/integrations/sync', { method: 'POST' });
    setSyncing(false);
    if (!response.ok) {
      toaster.show(t('channel_sync_failed'), 'warning');
      return;
    }
    const { total, added, disabled } = await response.json();
    toaster.show(t('channel_sync_done', { total, added, disabled }), 'success');
    update();
  }, [update]);

  return (
    <div className="flex group-[.sidebar]:flex-col gap-[8px]">
      <button
        className="flex-1 group-[.sidebar]:w-[100%] group-[.sidebar]:flex-none text-btnText bg-btnSimple h-[44px] px-[12px] justify-center items-center flex rounded-[12px] gap-[6px] whitespace-nowrap"
        onClick={add}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path
            d="M1.66675 10.0417C3.35907 10.2299 4.93698 10.9884 6.14101 12.1924C7.34504 13.3964 8.10353 14.9743 8.29175 16.6667M1.66675 13.4167C2.46749 13.58 3.20253 13.9751 3.7804 14.553C4.35827 15.1309 4.75344 15.8659 4.91675 16.6667M1.66675 16.6667H1.67508M11.6667 17.5H14.3334C15.7335 17.5 16.4336 17.5 16.9684 17.2275C17.4388 16.9878 17.8212 16.6054 18.0609 16.135C18.3334 15.6002 18.3334 14.9001 18.3334 13.5V6.5C18.3334 5.09987 18.3334 4.3998 18.0609 3.86502C17.8212 3.39462 17.4388 3.01217 16.9684 2.77248C16.4336 2.5 15.7335 2.5 14.3334 2.5H5.66675C4.26662 2.5 3.56655 2.5 3.03177 2.77248C2.56137 3.01217 2.17892 3.39462 1.93923 3.86502C1.66675 4.3998 1.66675 5.09987 1.66675 6.5V6.66667"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="text-start text-[14px] group-[.sidebar]:hidden">
          {t('add_channel')}
        </div>
      </button>
      <button
        onClick={sync}
        disabled={syncing}
        data-tooltip-id="tooltip"
        data-tooltip-content={t('sync_channels')}
        aria-label={t('sync_channels')}
        className="min-h-[44px] min-w-[44px] text-btnText bg-btnSimple justify-center items-center flex rounded-[12px] cursor-pointer disabled:opacity-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          className={syncing ? 'animate-spin' : ''}
        >
          <path
            d="M20 11A8 8 0 0 0 5.3 6.7L4 8M4 4v4h4M4 13a8 8 0 0 0 14.7 4.3L20 16M20 20v-4h-4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
};

export const CustomVariables: FC<{
  variables: CustomField[];
  identifier: string;
}> = ({ identifier, variables }) => {
  const connect = useConnect();
  const t = useT();
  const schema = useMemo(() => {
    return object(
      variables.reduce((acc, item) => {
        const splitter = item.validation.split('/');
        const regex = new RegExp(
          splitter.slice(1, -1).join('/'),
          splitter.pop()
        );
        return {
          ...acc,
          [item.key]: string()
            .matches(regex, t('field_is_invalid', { field: item.label }))
            .required(),
        };
      }, {})
    );
  }, [variables]);
  const methods = useForm({
    mode: 'onChange',
    resolver: yupResolver(schema),
    values: variables.reduce(
      (acc, item) =>
        item.defaultValue ? { ...acc, [item.key]: item.defaultValue } : acc,
      {}
    ),
  });

  return (
    <FormProvider {...methods}>
      <form
        className="gap-[8px] flex flex-col pt-[10px]"
        onSubmit={methods.handleSubmit((data) => connect(identifier, data))}
      >
        {variables.map((variable) => (
          <div key={variable.key} className="flex flex-col gap-[4px]">
            {!!variable.hint && (
              <div className="text-[12px] text-textItemBlur">
                {variable.hint}
              </div>
            )}
            <Input
              label={variable.label}
              name={variable.key}
              type={variable.type === 'text' ? 'text' : 'password'}
            />
          </div>
        ))}
        <div>
          <Button type="submit">{t('connect')}</Button>
        </div>
      </form>
    </FormProvider>
  );
};

export const AddProviderComponent: FC<{
  social: SocialProvider[];
}> = ({ social }) => {
  const modal = useModals();
  const connect = useConnect();
  const t = useT();

  const select = useCallback(
    (item: SocialProvider) => () => {
      if (item.customFields?.length) {
        modal.openModal({
          title: item.name,
          withCloseButton: true,
          children: (
            <CustomVariables
              identifier={item.identifier}
              variables={item.customFields}
            />
          ),
        });
        return;
      }
      connect(item.identifier);
    },
    []
  );

  return (
    <div className="grid grid-cols-5 gap-[10px] mobile:!grid-cols-3">
      {social.map((item) => (
        <button
          key={item.identifier}
          onClick={select(item)}
          {...(item.toolTip
            ? {
                'data-tooltip-id': 'tooltip',
                'data-tooltip-content': item.toolTip,
              }
            : {})}
          className="flex flex-col p-[10px] h-[100px] justify-center items-center gap-[10px] w-full text-[14px] mobile:text-[13px] rounded-[12px] bg-newTableHeader text-textColor hover:bg-boxHover"
        >
          <img
            className="w-[32px] h-[32px] rounded-full"
            src={`/icons/platforms/${item.identifier}.png`}
            alt=""
          />
          <div className="text-center whitespace-pre-wrap">{item.name}</div>
        </button>
      ))}
    </div>
  );
};
