'use client';

import { useCallback } from 'react';
import { FormProvider, Resolver, useForm } from 'react-hook-form';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import { Input } from '@vibeschedule/react/form/input';
import { Button } from '@vibeschedule/react/form/button';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';

interface PasswordValues {
  currentPassword: string;
  newPassword: string;
  repeatPassword: string;
}

export const ChangePasswordComponent = () => {
  const fetch = useFetch();
  const toaster = useToaster();
  const t = useT();

  const resolver = useCallback<Resolver<PasswordValues>>(
    async (values) => {
      const errors: Partial<
        Record<keyof PasswordValues, { type: string; message: string }>
      > = {};
      if (!values.currentPassword) {
        errors.currentPassword = {
          type: 'required',
          message: t('field_required'),
        };
      }
      if (values.newPassword.length < 8) {
        errors.newPassword = {
          type: 'minLength',
          message: t('password_min_length'),
        };
      }
      if (values.repeatPassword !== values.newPassword) {
        errors.repeatPassword = {
          type: 'validate',
          message: t('passwords_do_not_match'),
        };
      }
      return Object.keys(errors).length
        ? { values: {}, errors }
        : { values, errors: {} };
    },
    [t]
  );

  const form = useForm<PasswordValues>({
    defaultValues: { currentPassword: '', newPassword: '', repeatPassword: '' },
    resolver,
  });

  const submit = useCallback(
    async (values: PasswordValues) => {
      const response = await fetch('/user/password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });
      if (!response.ok) {
        const { message } = await response.json().catch(() => ({}));
        toaster.show(
          (Array.isArray(message) ? message[0] : message) ||
            t('password_change_failed'),
          'warning'
        );
        return;
      }
      form.reset();
      toaster.show(t('password_changed'));
    },
    [fetch, form, t, toaster]
  );

  return (
    <div className="flex flex-col gap-[16px] max-w-[480px]">
      <h3 className="text-[20px] font-[600]">{t('change_password')}</h3>
      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(submit)}
          className="flex flex-col gap-[4px] rounded-[20px] border border-newBorder p-[24px]"
        >
          <Input
            label={t('label_current_password')}
            name="currentPassword"
            type="password"
            autoComplete="current-password"
          />
          <Input
            label={t('label_new_password')}
            name="newPassword"
            type="password"
            autoComplete="new-password"
          />
          <Input
            label={t('label_repeat_password')}
            name="repeatPassword"
            type="password"
            autoComplete="new-password"
          />
          <div className="flex">
            <Button type="submit" loading={form.formState.isSubmitting}>
              {t('change_password')}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};
