'use client';

import { useForm, SubmitHandler, FormProvider } from 'react-hook-form';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { Button } from '@vibeschedule/react/form/button';
import { Input } from '@vibeschedule/react/form/input';
import { useState } from 'react';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';

type Inputs = {
  email: string;
  password: string;
};

export function Login() {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const form = useForm<Inputs>();
  const fetchData = useFetch();

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setLoading(true);
    const login = await fetchData('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ ...data, provider: 'LOCAL' }),
    });
    if (login.status >= 400) {
      form.setError('email', { message: t('login_failed') });
      setLoading(false);
    }
  };

  return (
    <FormProvider {...form}>
      <form
        className="flex flex-col gap-[20px]"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <h1 className="text-[28px] font-display font-bold tracking-tight">
          {t('sign_in')}
        </h1>
        <div className="flex flex-col gap-[12px]">
          <Input
            label={t('label_email')}
            {...form.register('email', { required: true })}
            type="email"
            autoComplete="email"
            placeholder={t('email_address')}
          />
          <Input
            label={t('label_password')}
            {...form.register('password', { required: true })}
            type="password"
            autoComplete="current-password"
            placeholder={t('label_password')}
          />
        </div>
        <Button
          type="submit"
          className="rounded-[12px] !h-[48px]"
          loading={loading}
        >
          {t('sign_in_1')}
        </Button>
      </form>
    </FormProvider>
  );
}
