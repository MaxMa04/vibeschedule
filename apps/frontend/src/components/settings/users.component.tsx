'use client';

import { FC, useCallback } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { FormProvider, Resolver, useForm } from 'react-hook-form';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useUser } from '@vibeschedule/frontend/components/layout/user.context';
import { useModals } from '@vibeschedule/frontend/components/layout/new-modal';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import { deleteDialog } from '@vibeschedule/react/helpers/delete.dialog';
import { Input } from '@vibeschedule/react/form/input';
import { Select } from '@vibeschedule/react/form/select';
import { Button } from '@vibeschedule/react/form/button';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';

type Role = 'ADMIN' | 'USER';

interface TeamUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt: string;
}

interface CreateUserValues {
  name: string;
  email: string;
  password: string;
  role: Role;
}

type FieldErrors<T> = Partial<
  Record<keyof T, { type: string; message: string }>
>;

const responseMessage = async (response: Response) => {
  const { message } = await response.json().catch(() => ({}));
  return (Array.isArray(message) ? message[0] : message) as string | undefined;
};

const useTeam = () => {
  const fetch = useFetch();
  return useSWR('/settings/team', async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(await responseMessage(response));
    }
    return (await response.json()).users as TeamUser[];
  });
};

const CreateUserModal: FC<{ onClose: () => void; onSaved: () => void }> = ({
  onClose,
  onSaved,
}) => {
  const fetch = useFetch();
  const toaster = useToaster();
  const t = useT();

  const resolver = useCallback<Resolver<CreateUserValues>>(
    async (values) => {
      const errors: FieldErrors<CreateUserValues> = {};
      if (!values.name.trim()) {
        errors.name = { type: 'required', message: t('field_required') };
      }
      if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) {
        errors.email = { type: 'pattern', message: t('email_invalid') };
      }
      if (values.password.length < 8) {
        errors.password = {
          type: 'minLength',
          message: t('password_min_length'),
        };
      }
      return Object.keys(errors).length
        ? { values: {}, errors }
        : { values, errors: {} };
    },
    [t]
  );

  const form = useForm<CreateUserValues>({
    defaultValues: { name: '', email: '', password: '', role: 'USER' },
    resolver,
  });

  const submit = useCallback(
    async (values: CreateUserValues) => {
      const response = await fetch('/settings/team/users', {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          name: values.name.trim(),
          email: values.email.trim(),
        }),
      });
      if (response.status === 409) {
        form.setError('email', { message: t('email_already_taken') });
        return;
      }
      if (!response.ok) {
        toaster.show(
          (await responseMessage(response)) || t('user_create_failed'),
          'warning'
        );
        return;
      }
      toaster.show(t('user_created'));
      onSaved();
      onClose();
    },
    [fetch, form, onClose, onSaved, t, toaster]
  );

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(submit)}
        className="flex flex-col gap-[4px] w-[420px] mobile:w-full"
      >
        <Input label={t('label_name')} name="name" autoComplete="off" />
        <Input
          label={t('label_email')}
          name="email"
          type="email"
          autoComplete="off"
        />
        <Input
          label={t('label_password')}
          name="password"
          type="password"
          autoComplete="new-password"
        />
        <Select label={t('label_role')} name="role">
          <option value="USER">{t('role_user')}</option>
          <option value="ADMIN">{t('admin')}</option>
        </Select>
        <div className="flex gap-[8px] justify-end">
          <Button secondary={true} onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button type="submit" loading={form.formState.isSubmitting}>
            {t('create_user')}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};

const ResetPasswordModal: FC<{ user: TeamUser; onClose: () => void }> = ({
  user,
  onClose,
}) => {
  const fetch = useFetch();
  const toaster = useToaster();
  const t = useT();

  const resolver = useCallback<Resolver<{ password: string }>>(
    async (values) => {
      const errors: FieldErrors<{ password: string }> = {};
      if (values.password.length < 8) {
        errors.password = {
          type: 'minLength',
          message: t('password_min_length'),
        };
      }
      return Object.keys(errors).length
        ? { values: {}, errors }
        : { values, errors: {} };
    },
    [t]
  );

  const form = useForm<{ password: string }>({
    defaultValues: { password: '' },
    resolver,
  });

  const submit = useCallback(
    async (values: { password: string }) => {
      const response = await fetch(`/settings/team/users/${user.id}/password`, {
        method: 'PUT',
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        toaster.show(
          (await responseMessage(response)) || t('password_change_failed'),
          'warning'
        );
        return;
      }
      toaster.show(t('password_changed'));
      onClose();
    },
    [fetch, onClose, t, toaster, user.id]
  );

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(submit)}
        className="flex flex-col gap-[4px] w-[420px] mobile:w-full"
      >
        <div className="text-[14px] text-textItemBlur mb-[12px]">
          {user.name || user.email}
        </div>
        <Input
          label={t('label_new_password')}
          name="password"
          type="password"
          autoComplete="new-password"
        />
        <div className="flex gap-[8px] justify-end">
          <Button secondary={true} onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button type="submit" loading={form.formState.isSubmitting}>
            {t('reset_password')}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};

export const UsersComponent = () => {
  const me = useUser();
  const fetch = useFetch();
  const modals = useModals();
  const toaster = useToaster();
  const t = useT();
  const { data, isLoading, error, mutate } = useTeam();

  const createUser = useCallback(() => {
    modals.openModal({
      title: t('create_user'),
      children: (close) => (
        <CreateUserModal onClose={close} onSaved={() => mutate()} />
      ),
    });
  }, [modals, mutate, t]);

  const resetPassword = useCallback(
    (user: TeamUser) => () => {
      modals.openModal({
        title: t('reset_password'),
        children: (close) => <ResetPasswordModal user={user} onClose={close} />,
      });
    },
    [modals, t]
  );

  const remove = useCallback(
    (user: TeamUser) => async () => {
      if (
        !(await deleteDialog(
          t('remove_user_confirm', { name: user.name || user.email }),
          t('remove'),
          t('remove_user'),
          t('cancel'),
          true
        ))
      ) {
        return;
      }
      const response = await fetch(`/settings/team/${user.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        toaster.show(
          (await responseMessage(response)) || t('user_remove_failed'),
          'warning'
        );
        return;
      }
      toaster.show(t('user_removed'));
      mutate();
    },
    [fetch, mutate, t, toaster]
  );

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex items-center gap-[12px]">
        <h3 className="text-[20px] font-[600] flex-1">
          {t('settings_tab_users')}
        </h3>
        <Button onClick={createUser}>{t('create_user')}</Button>
      </div>
      <div className="rounded-[20px] border border-newBorder overflow-x-auto">
        <table className="w-full text-[14px]">
          <thead>
            <tr className="text-textItemBlur border-b border-newBorder">
              <th className="font-[500] text-start px-[20px] py-[12px]">
                {t('label_name')}
              </th>
              <th className="font-[500] text-start px-[20px] py-[12px]">
                {t('label_email')}
              </th>
              <th className="font-[500] text-start px-[20px] py-[12px]">
                {t('label_role')}
              </th>
              <th className="font-[500] text-start px-[20px] py-[12px]">
                {t('created_at')}
              </th>
              <th className="px-[20px] py-[12px]" />
            </tr>
          </thead>
          <tbody>
            {(data || []).map((p) => (
              <tr
                key={p.id}
                className="border-b border-newBorder last:border-b-0"
              >
                <td className="px-[20px] py-[14px] whitespace-nowrap">
                  {p.name || '-'}
                  {p.id === me?.id && (
                    <span className="text-textItemBlur"> ({t('you')})</span>
                  )}
                </td>
                <td className="px-[20px] py-[14px]">{p.email}</td>
                <td className="px-[20px] py-[14px]">
                  {p.role === 'ADMIN' ? t('admin') : t('role_user')}
                </td>
                <td className="px-[20px] py-[14px] whitespace-nowrap">
                  {dayjs(p.createdAt).format('DD.MM.YYYY')}
                </td>
                <td className="px-[20px] py-[14px]">
                  <div className="flex gap-[16px] justify-end whitespace-nowrap">
                    <button
                      type="button"
                      className="text-textItemBlur hover:text-newTextColor"
                      onClick={resetPassword(p)}
                    >
                      {t('reset_password')}
                    </button>
                    {p.id !== me?.id && (
                      <button
                        type="button"
                        className="text-error hover:opacity-80"
                        onClick={remove(p)}
                      >
                        {t('remove')}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {(isLoading || error || !data?.length) && (
              <tr>
                <td
                  colSpan={5}
                  className="px-[20px] py-[24px] text-center text-textItemBlur"
                >
                  {isLoading
                    ? t('loading')
                    : error
                    ? t('users_load_failed')
                    : t('no_users')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
