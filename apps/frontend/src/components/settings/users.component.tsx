'use client';
import { useChannelList } from '@vibeschedule/frontend/lib/shared-data';
import { NO_APP } from '@vibeschedule/helpers/channels/channel.filter';

import { FC, FormEvent, useCallback, useId, useMemo, useState } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { Controller, Resolver, useForm } from 'react-hook-form';
import {
  KeyRoundIcon,
  MoreHorizontalIcon,
  RadioTowerIcon,
  Trash2Icon,
  UserPlusIcon,
} from 'lucide-react';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useUser } from '@vibeschedule/frontend/components/layout/user.context';
import { useModals } from '@vibeschedule/frontend/components/layout/new-modal';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import { deleteDialog } from '@vibeschedule/react/helpers/delete.dialog';
import { responseMessage } from '@vibeschedule/frontend/lib/response-message';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { cn } from '@vibeschedule/frontend/lib/utils';
import {
  initials,
  useRoleLabel,
  UserRole,
} from '@vibeschedule/frontend/components/settings/profile.component';
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
import { ChannelAvatar } from '@vibeschedule/frontend/components/launches/channel.avatar';
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from '@vibeschedule/frontend/components/ui/avatar';
import { Checkbox } from '@vibeschedule/frontend/components/ui/checkbox';
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

interface TeamUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  channels: string[];
  createdAt: string;
}

interface Channel {
  id: string;
  name: string;
  identifier: string;
  picture: string;
  display?: string | null;
  disabled: boolean;
  app: { id: string; name: string } | null;
}

interface CreateUserValues {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

type FieldErrors<T> = Partial<
  Record<keyof T, { type: string; message: string }>
>;


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

const useChannels = () => useChannelList<Channel>();

const ChannelPicker: FC<{
  selected: string[];
  onChange: (selected: string[]) => void;
  invalid?: boolean;
}> = ({ selected, onChange, invalid }) => {
  const t = useT();
  const { data, isLoading } = useChannels();

  const groups = useMemo(() => {
    const channels = data || [];
    const apps = new Map<string, string>();
    for (const channel of channels) {
      if (channel.app) {
        apps.set(channel.app.id, channel.app.name);
      }
    }
    return [
      ...[...apps]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'de')),
      { id: NO_APP, name: t('formats_no_app') },
    ]
      .map((group) => ({
        ...group,
        channels: channels.filter(
          (channel) => (channel.app?.id || NO_APP) === group.id
        ),
      }))
      .filter((group) => group.channels.length > 0);
  }, [data, t]);

  const toggle = (id: string) =>
    onChange(
      selected.includes(id)
        ? selected.filter((p) => p !== id)
        : [...selected, id]
    );

  const toggleGroup = (channels: Channel[], all: boolean) => {
    const ids = channels.map((channel) => channel.id);
    onChange(
      all
        ? selected.filter((id) => !ids.includes(id))
        : [...selected, ...ids.filter((id) => !selected.includes(id))]
    );
  };

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (!groups.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('clipper_no_channels')}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => {
        const count = group.channels.filter((channel) =>
          selected.includes(channel.id)
        ).length;
        const all = count === group.channels.length;
        return (
          <div key={group.id} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{group.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {count}/{group.channels.length}
              </span>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                className="ms-auto"
                onClick={() => toggleGroup(group.channels, all)}
              >
                {all ? t('clipper_select_none') : t('clipper_select_all')}
              </Button>
            </div>
            <div
              className={cn(
                'flex flex-col divide-y overflow-hidden rounded-lg border',
                invalid && 'border-destructive'
              )}
            >
              {group.channels.map((channel) => (
                <label
                  key={channel.id}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50 has-data-checked:bg-primary/5"
                >
                  <Checkbox
                    checked={selected.includes(channel.id)}
                    onCheckedChange={() => toggle(channel.id)}
                  />
                  <ChannelAvatar
                    picture={channel.picture}
                    identifier={channel.identifier}
                    name={channel.name}
                    disabled={channel.disabled}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">
                      {channel.name}
                    </span>
                    {!!channel.display && channel.display !== channel.name && (
                      <span className="truncate text-xs text-muted-foreground">
                        {channel.display}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ChannelsHint: FC<{ role: UserRole }> = ({ role }) => {
  const t = useT();
  return (
    <FieldDescription>
      {role === 'CLIPPER'
        ? t('clipper_channels_hint')
        : t('responsible_channels_hint')}
    </FieldDescription>
  );
};

const ChannelsForm: FC<{
  user: TeamUser;
  onClose: () => void;
  onSaved: () => void;
}> = ({ user, onClose, onSaved }) => {
  const fetch = useFetch();
  const toaster = useToaster();
  const t = useT();
  const [channels, setChannels] = useState(user.channels);
  const [saving, setSaving] = useState(false);
  // the channel list carries the responsible users
  const { mutate: mutateChannels } = useChannels();

  const save = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setSaving(true);
      const response = await fetch(`/settings/team/users/${user.id}/channels`, {
        method: 'PUT',
        body: JSON.stringify({ channels }),
      });
      setSaving(false);
      if (!response.ok) {
        toaster.show(
          (await responseMessage(response)) || t('clipper_channels_failed'),
          'warning'
        );
        return;
      }
      toaster.show(t('clipper_channels_saved'));
      mutateChannels();
      onSaved();
      onClose();
    },
    [channels, fetch, mutateChannels, onClose, onSaved, t, toaster, user.id]
  );

  return (
    <form onSubmit={save} className="flex flex-1 flex-col gap-6" noValidate>
      <Field>
        <ChannelsHint role={user.role} />
        <ChannelPicker selected={channels} onChange={setChannels} />
      </Field>
      <SheetActions onClose={onClose} submitting={saving} label={t('save')} />
    </form>
  );
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
  const roleLabel = useRoleLabel();
  const [channels, setChannels] = useState<string[]>([]);
  const [channelsMissing, setChannelsMissing] = useState(false);
  const { mutate: mutateChannels } = useChannels();

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

  const role = form.watch('role');

  const pickChannels = useCallback((next: string[]) => {
    setChannels(next);
    setChannelsMissing(false);
  }, []);

  const submit = useCallback(
    async (values: CreateUserValues) => {
      if (values.role === 'CLIPPER' && !channels.length) {
        setChannelsMissing(true);
        return;
      }
      const response = await fetch('/settings/team/users', {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          name: values.name.trim(),
          email: values.email.trim(),
          channels,
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
      if (channels.length) mutateChannels();
      onSaved();
      onClose();
    },
    [channels, fetch, form, mutateChannels, onClose, onSaved, t, toaster]
  );

  const roles = (['USER', 'ADMIN', 'CLIPPER'] as const).map((value) => ({
    value,
    label: roleLabel(value),
  }));
  const roleDescription = {
    USER: t('role_description_user'),
    ADMIN: t('role_description_admin'),
    CLIPPER: t('role_description_clipper'),
  }[role];

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
                onValueChange={(value) => field.onChange(value as UserRole)}
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
          <FieldDescription>{roleDescription}</FieldDescription>
        </Field>
        <Field>
            <FieldLabel>{t('responsible_for')}</FieldLabel>
            <ChannelsHint role={role} />
            <ChannelPicker
              selected={channels}
              onChange={pickChannels}
              invalid={channelsMissing}
            />
            {channelsMissing && role === 'CLIPPER' && (
              <FieldError>{t('clipper_channels_required')}</FieldError>
            )}
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

const UserChannels: FC<{ channels: Channel[]; onClick: () => void }> = ({
  channels,
  onClick,
}) => {
  const t = useT();
  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      className="-ms-2 h-7 text-muted-foreground"
      onClick={onClick}
    >
      {channels.length > 0 && (
        <AvatarGroup className="me-0.5 max-sm:hidden">
          {channels.slice(0, 3).map((channel) => (
            <Avatar key={channel.id} size="sm" className="size-5">
              <AvatarImage src={channel.picture} alt="" />
              <AvatarFallback className="text-xs">
                {channel.name.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
        </AvatarGroup>
      )}
      {channels.length
        ? t('clipper_channels_count', { count: channels.length })
        : t('clipper_no_channels_assigned')}
    </Button>
  );
};

export const UsersComponent = () => {
  const me = useUser();
  const fetch = useFetch();
  const modals = useModals();
  const toaster = useToaster();
  const t = useT();
  const { data, isLoading, error, mutate } = useTeam();
  const { data: allChannels } = useChannels();
  const roleLabel = useRoleLabel();

  const channelsOf = useCallback(
    (user: TeamUser) =>
      (allChannels || []).filter((channel) =>
        user.channels.includes(channel.id)
      ),
    [allChannels]
  );

  const editChannels = useCallback(
    (user: TeamUser) => () => {
      modals.openModal({
        variant: 'sheet',
        title: t('responsible_for'),
        description: user.name || user.email,
        children: (close) => (
          <ChannelsForm user={user} onClose={close} onSaved={() => mutate()} />
        ),
      });
    },
    [modals, mutate, t]
  );

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
                <div className="flex flex-col items-start gap-1.5 lg:flex-row lg:items-center lg:gap-2">
                  <Badge
                    variant={
                      p.role === 'ADMIN'
                        ? 'default'
                        : p.role === 'CLIPPER'
                        ? 'outline'
                        : 'secondary'
                    }
                  >
                    {roleLabel(p.role)}
                  </Badge>
                  <UserChannels
                    channels={channelsOf(p)}
                    onClick={editChannels(p)}
                  />
                </div>
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
                    <DropdownMenuItem onClick={editChannels(p)}>
                      <RadioTowerIcon />
                      {t('responsible_for')}
                    </DropdownMenuItem>
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
