'use client';

import { FC, useCallback, useId } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { Controller, Resolver, useForm } from 'react-hook-form';
import {
  KeyRoundIcon,
  MoreHorizontalIcon,
  Trash2Icon,
  UserPlusIcon,
} from 'lucide-react';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useUser } from '@vibeschedule/frontend/components/layout/user.context';
import { useModals } from '@vibeschedule/frontend/components/layout/new-modal';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import { deleteDialog } from '@vibeschedule/react/helpers/delete.dialog';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { initials } from '@vibeschedule/frontend/components/settings/profile.component';
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@vibeschedule/frontend/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@vibeschedule/frontend/components/ui/table';
import {
  Avatar,
  AvatarFallback,
} from '@vibeschedule/frontend/components/ui/avatar';
import { Badge } from '@vibeschedule/frontend/components/ui/badge';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import { Input } from '@vibeschedule/frontend/components/ui/input';
import { Skeleton } from '@vibeschedule/frontend/components/ui/skeleton';
import { Spinner } from '@vibeschedule/frontend/components/ui/spinner';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@vibeschedule/frontend/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@vibeschedule/frontend/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@vibeschedule/frontend/components/ui/dropdown-menu';

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

const SheetActions: FC<{
  onClose: () => void;
  submitting: boolean;
  label: string;
}> = ({ onClose, submitting, label }) => {
  const t = useT();
  return (
    <div className="mt-auto flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
      <Button
        variant="outline"
        className="h-10 md:h-8"
        type="button"
        onClick={onClose}
      >
        {t('cancel')}
      </Button>
      <Button className="h-10 md:h-8" type="submit" disabled={submitting}>
        {submitting && <Spinner data-icon="inline-start" />}
        {label}
      </Button>
    </div>
  );
};

const CreateUserForm: FC<{ onClose: () => void; onSaved: () => void }> = ({
  onClose,
  onSaved,
}) => {
  const fetch = useFetch();
  const toaster = useToaster();
  const t = useT();
  const id = useId();

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
  const { errors, isSubmitting } = form.formState;

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

  const roles = [
    { value: 'USER', label: t('role_user') },
    { value: 'ADMIN', label: t('admin') },
  ];

  return (
    <form
      onSubmit={form.handleSubmit(submit)}
      className="flex flex-1 flex-col gap-6"
      noValidate
    >
      <FieldGroup>
        <Field data-invalid={!!errors.name || undefined}>
          <FieldLabel htmlFor={`${id}-name`}>{t('label_name')}</FieldLabel>
          <Input
            id={`${id}-name`}
            autoComplete="off"
            className="h-10 md:h-9"
            aria-invalid={!!errors.name || undefined}
            {...form.register('name')}
          />
          <FieldError>{errors.name?.message}</FieldError>
        </Field>
        <Field data-invalid={!!errors.email || undefined}>
          <FieldLabel htmlFor={`${id}-email`}>{t('label_email')}</FieldLabel>
          <Input
            id={`${id}-email`}
            type="email"
            autoComplete="off"
            className="h-10 md:h-9"
            aria-invalid={!!errors.email || undefined}
            {...form.register('email')}
          />
          <FieldError>{errors.email?.message}</FieldError>
        </Field>
        <Field data-invalid={!!errors.password || undefined}>
          <FieldLabel htmlFor={`${id}-password`}>
            {t('label_password')}
          </FieldLabel>
          <Input
            id={`${id}-password`}
            type="password"
            autoComplete="new-password"
            className="h-10 md:h-9"
            aria-invalid={!!errors.password || undefined}
            {...form.register('password')}
          />
          {errors.password ? (
            <FieldError>{errors.password.message}</FieldError>
          ) : (
            <FieldDescription>{t('password_min_length')}</FieldDescription>
          )}
        </Field>
        <Field>
          <FieldLabel>{t('label_role')}</FieldLabel>
          <Controller
            control={form.control}
            name="role"
            render={({ field }) => (
              <Select
                items={roles}
                value={field.value}
                onValueChange={(value) => field.onChange(value as Role)}
              >
                <SelectTrigger className="h-10 w-full md:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldDescription>{t('role_description')}</FieldDescription>
        </Field>
      </FieldGroup>
      <SheetActions
        onClose={onClose}
        submitting={isSubmitting}
        label={t('create_user')}
      />
    </form>
  );
};

const ResetPasswordForm: FC<{ user: TeamUser; onClose: () => void }> = ({
  user,
  onClose,
}) => {
  const fetch = useFetch();
  const toaster = useToaster();
  const t = useT();
  const id = useId();

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
  const { errors, isSubmitting } = form.formState;

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
    <form
      onSubmit={form.handleSubmit(submit)}
      className="flex flex-1 flex-col gap-6"
      noValidate
    >
      <Field data-invalid={!!errors.password || undefined}>
        <FieldLabel htmlFor={`${id}-password`}>
          {t('label_new_password')}
        </FieldLabel>
        <Input
          id={`${id}-password`}
          type="password"
          autoComplete="new-password"
          className="h-10 md:h-9"
          aria-invalid={!!errors.password || undefined}
          {...form.register('password')}
        />
        {errors.password ? (
          <FieldError>{errors.password.message}</FieldError>
        ) : (
          <FieldDescription>{t('password_min_length')}</FieldDescription>
        )}
      </Field>
      <SheetActions
        onClose={onClose}
        submitting={isSubmitting}
        label={t('reset_password')}
      />
    </form>
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
      variant: 'sheet',
      title: t('create_user'),
      description: t('create_user_description'),
      children: (close) => (
        <CreateUserForm onClose={close} onSaved={() => mutate()} />
      ),
    });
  }, [modals, mutate, t]);

  const resetPassword = useCallback(
    (user: TeamUser) => () => {
      modals.openModal({
        variant: 'sheet',
        title: t('reset_password'),
        description: user.name || user.email,
        children: (close) => <ResetPasswordForm user={user} onClose={close} />,
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
          t('cancel')
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
    <Card className="pb-0">
      <CardHeader>
        <CardTitle>{t('settings_tab_users')}</CardTitle>
        <CardDescription>{t('users_description')}</CardDescription>
        <CardAction>
          <Button className="h-10 md:h-8" onClick={createUser}>
            <UserPlusIcon data-icon="inline-start" />
            <span className="max-sm:sr-only">{t('create_user')}</span>
          </Button>
        </CardAction>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="ps-4">{t('label_name')}</TableHead>
            <TableHead className="max-md:hidden">{t('label_email')}</TableHead>
            <TableHead>{t('label_role')}</TableHead>
            <TableHead className="max-md:hidden">{t('created_at')}</TableHead>
            <TableHead className="w-12 pe-4" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            [0, 1].map((i) => (
              <TableRow key={i}>
                <TableCell className="ps-4" colSpan={5}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ))}
          {!isLoading && (error || !data?.length) && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-8 text-center text-muted-foreground"
              >
                {error ? t('users_load_failed') : t('no_users')}
              </TableCell>
            </TableRow>
          )}
          {(data || []).map((p) => (
            <TableRow key={p.id}>
              <TableCell className="w-full max-w-0 ps-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">
                      {initials(p.name || p.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">
                      {p.name || p.email}
                      {p.id === me?.id && (
                        <span className="font-normal text-muted-foreground">
                          {' '}
                          ({t('you')})
                        </span>
                      )}
                    </span>
                    {!!p.name && (
                      <span className="truncate text-xs text-muted-foreground md:hidden">
                        {p.email}
                      </span>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground max-md:hidden">
                {p.email}
              </TableCell>
              <TableCell>
                <Badge variant={p.role === 'ADMIN' ? 'default' : 'secondary'}>
                  {p.role === 'ADMIN' ? t('admin') : t('role_user')}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums max-md:hidden">
                {dayjs(p.createdAt).format('DD.MM.YYYY')}
              </TableCell>
              <TableCell className="pe-4 text-end">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-10 md:size-8"
                        aria-label={t('actions')}
                      />
                    }
                  >
                    <MoreHorizontalIcon />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={resetPassword(p)}>
                      <KeyRoundIcon />
                      {t('reset_password')}
                    </DropdownMenuItem>
                    {p.id !== me?.id && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={remove(p)}
                        >
                          <Trash2Icon />
                          {t('remove_user')}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};
