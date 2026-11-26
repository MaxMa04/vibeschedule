'use client';

import { useId, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { CircleAlertIcon } from 'lucide-react';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@vibeschedule/frontend/components/ui/card';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import { Input } from '@vibeschedule/frontend/components/ui/input';
import { Spinner } from '@vibeschedule/frontend/components/ui/spinner';
import { Alert, AlertTitle } from '@vibeschedule/frontend/components/ui/alert';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@vibeschedule/frontend/components/ui/field';

type Inputs = {
  email: string;
  password: string;
};

export function Login() {
  const t = useT();
  const id = useId();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const form = useForm<Inputs>({ defaultValues: { email: '', password: '' } });
  const fetchData = useFetch();

  // a successful login answers with a "reload" header, the fetch wrapper
  // then navigates away, so loading stays on
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setLoading(true);
    setFailed(false);
    const login = await fetchData('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ ...data, provider: 'LOCAL' }),
    });
    if (login.status >= 400) {
      setFailed(true);
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-lg font-semibold">{t('sign_in')}</CardTitle>
        <CardDescription>{t('sign_in_description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-5">
            {failed && (
              <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertTitle>{t('login_failed')}</AlertTitle>
              </Alert>
            )}
            <Field>
              <FieldLabel htmlFor={`${id}-email`}>
                {t('label_email')}
              </FieldLabel>
              <Input
                id={`${id}-email`}
                type="email"
                autoComplete="email"
                autoFocus
                required
                placeholder={t('email_placeholder')}
                className="h-10"
                aria-invalid={failed || undefined}
                {...form.register('email', { required: true })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-password`}>
                {t('label_password')}
              </FieldLabel>
              <Input
                id={`${id}-password`}
                type="password"
                autoComplete="current-password"
                required
                className="h-10"
                aria-invalid={failed || undefined}
                {...form.register('password', { required: true })}
              />
            </Field>
            <Button type="submit" className="h-10 w-full" disabled={loading}>
              {loading && <Spinner data-icon="inline-start" />}
              {t('sign_in_1')}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
