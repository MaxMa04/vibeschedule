'use client';

import { useCallback, useId } from 'react';
import { Resolver, useForm } from 'react-hook-form';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@vibeschedule/frontend/components/ui/card';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import { Input } from '@vibeschedule/frontend/components/ui/input';
import { Spinner } from '@vibeschedule/frontend/components/ui/spinner';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@vibeschedule/frontend/components/ui/field';

interface PasswordValues {
  currentPassword: string;
  newPassword: string;
  repeatPassword: string;
}

export const ChangePasswordComponent = () => {
  const fetch = useFetch();
  const toaster = useToaster();
  const t = useT();
  const id = useId();

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
  const { errors, isSubmitting } = form.formState;

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

  const fields: Array<{
    name: keyof PasswordValues;
    label: string;
    autoComplete: string;
    hint?: string;
  }> = [
    {
      name: 'currentPassword',
      label: t('label_current_password'),
      autoComplete: 'current-password',
    },
    {
      name: 'newPassword',
      label: t('label_new_password'),
      autoComplete: 'new-password',
      hint: t('password_min_length'),
    },
    {
      name: 'repeatPassword',
      label: t('label_repeat_password'),
      autoComplete: 'new-password',
    },
  ];

  return (
    <Card>
      <form onSubmit={form.handleSubmit(submit)} noValidate>
        <CardHeader>
          <CardTitle>{t('change_password')}</CardTitle>
          <CardDescription>{t('change_password_description')}</CardDescription>
        </CardHeader>
        <CardContent className="py-4">
          <FieldGroup className="max-w-sm">
            {fields.map((field) => (
              <Field
                key={field.name}
                data-invalid={!!errors[field.name] || undefined}
              >
                <FieldLabel htmlFor={`${id}-${field.name}`}>
                  {field.label}
                </FieldLabel>
                <Input
                  id={`${id}-${field.name}`}
                  type="password"
                  autoComplete={field.autoComplete}
                  className="h-10 md:h-9"
                  aria-invalid={!!errors[field.name] || undefined}
                  {...form.register(field.name)}
                />
                {errors[field.name] ? (
                  <FieldError>{errors[field.name]?.message}</FieldError>
                ) : (
                  !!field.hint && (
                    <FieldDescription>{field.hint}</FieldDescription>
                  )
                )}
              </Field>
            ))}
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            type="submit"
            className="h-10 w-full sm:w-fit md:h-8"
            disabled={isSubmitting}
          >
            {isSubmitting && <Spinner data-icon="inline-start" />}
            {t('change_password')}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
