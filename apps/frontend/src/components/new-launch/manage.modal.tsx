'use client';

import React, {
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { SendIcon, Trash2Icon, XIcon } from 'lucide-react';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { makeId } from '@vibeschedule/nestjs-libraries/services/make.is';
import { stripHtmlValidation } from '@vibeschedule/helpers/utils/strip.html.validation';
import { countLength } from '@vibeschedule/helpers/utils/count.length';
import { AddEditModalProps } from '@vibeschedule/frontend/components/new-launch/add.edit.modal';
import { PicksSocialsComponent } from '@vibeschedule/frontend/components/new-launch/picks.socials.component';
import { ContentEditor } from '@vibeschedule/frontend/components/new-launch/editor';
import {
  providerFor,
  ShowAllProviders,
  ShowAllProvidersHandle,
} from '@vibeschedule/frontend/components/new-launch/providers/show.all.providers';
import { useLaunchStore } from '@vibeschedule/frontend/components/new-launch/store';
import {
  useEditorSlots,
  usePreviewSlotRef,
  useSettingsSlotRef,
} from '@vibeschedule/frontend/components/new-launch/slots';
import { DateTimePicker } from '@vibeschedule/frontend/components/new-launch/date.time.picker';
import { FormatSelect } from '@vibeschedule/frontend/components/new-launch/format.select';
import { useExistingData } from '@vibeschedule/frontend/components/launches/helpers/use.existing.data';
import { ChannelAvatar } from '@vibeschedule/frontend/components/launches/channel.avatar';
import { Integrations } from '@vibeschedule/frontend/components/launches/calendar.context';
import { newDayjs } from '@vibeschedule/frontend/components/layout/set.timezone';
import {
  areYouSure,
  useModals,
} from '@vibeschedule/frontend/components/layout/new-modal';
import {
  PageBody,
  PageHeader,
} from '@vibeschedule/frontend/components/layout/page-header';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@vibeschedule/frontend/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@vibeschedule/frontend/components/ui/field';
import { Spinner } from '@vibeschedule/frontend/components/ui/spinner';
import { Badge } from '@vibeschedule/frontend/components/ui/badge';
import { cn } from '@vibeschedule/frontend/lib/utils';
import dayjs from 'dayjs';

type SaveType = 'draft' | 'now' | 'schedule';

const plainText = (html: string) => stripHtmlValidation('normal', html, true);

const ChannelHeading: FC<{ integration: Integrations }> = ({ integration }) => (
  <div className="flex min-w-0 items-center gap-2">
    <ChannelAvatar
      picture={integration.picture}
      identifier={integration.identifier}
      name={integration.name}
      size="sm"
    />
    <span className="truncate text-sm font-medium">{integration.name}</span>
  </div>
);

// the place a channel's settings form renders into
const SettingsSection: FC<{ integration: Integrations }> = ({
  integration,
}) => {
  const ref = useSettingsSlotRef(integration.id);
  return (
    <section className="flex flex-col gap-3 border-t pt-4 first:border-t-0 first:pt-0">
      <ChannelHeading integration={integration} />
      <div ref={ref} />
    </section>
  );
};

const SettingsCard: FC = () => {
  const t = useT();
  const selectedIntegrations = useLaunchStore(
    (state) => state.selectedIntegrations
  );
  const withSettings = selectedIntegrations.filter(
    (p) => providerFor(p.integration.identifier)?.hasSettings
  );

  if (!withSettings.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('editor_platform_settings')}</CardTitle>
        <CardDescription>{t('editor_platform_settings_hint')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {withSettings.map(({ integration }) => (
          <SettingsSection key={integration.id} integration={integration} />
        ))}
      </CardContent>
    </Card>
  );
};

const PreviewCard: FC = () => {
  const t = useT();
  const previewRef = usePreviewSlotRef();
  const { current, selectedIntegrations } = useLaunchStore(
    useShallow((state) => ({
      current: state.current,
      selectedIntegrations: state.selectedIntegrations,
    }))
  );
  const { previewId, setPreviewId } = useEditorSlots(
    useShallow((state) => ({
      previewId: state.previewId,
      setPreviewId: state.setPreviewId,
    }))
  );

  // the preview follows the channel being edited
  useEffect(() => {
    if (current !== 'global') {
      setPreviewId(current);
      return;
    }
    if (!selectedIntegrations.some((p) => p.integration.id === previewId)) {
      setPreviewId(selectedIntegrations[0]?.integration.id || null);
    }
  }, [current, selectedIntegrations]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('post_preview')}</CardTitle>
        {selectedIntegrations.length > 1 && (
          <CardAction className="flex gap-1">
            {selectedIntegrations.map(({ integration }) => (
              <button
                key={integration.id}
                type="button"
                title={integration.name}
                aria-pressed={previewId === integration.id}
                onClick={() => setPreviewId(integration.id)}
                className={cn(
                  'cursor-pointer rounded-full p-0.5 ring-2 transition-opacity',
                  previewId === integration.id
                    ? 'ring-primary'
                    : 'opacity-60 ring-transparent hover:opacity-100'
                )}
              >
                <ChannelAvatar
                  picture={integration.picture}
                  identifier={integration.identifier}
                  name={integration.name}
                  size="xs"
                />
              </button>
            ))}
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {!selectedIntegrations.length && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('editor_preview_pick_channel')}
          </p>
        )}
        <div
          ref={previewRef}
          className={cn(
            'overflow-hidden rounded-lg border',
            !selectedIntegrations.length && 'hidden'
          )}
        />
      </CardContent>
    </Card>
  );
};

export const ManageModal: FC<AddEditModalProps> = (props) => {
  const t = useT();
  const fetch = useFetch();
  const router = useRouter();
  const modal = useModals();
  const existingData = useExistingData();
  const ref = useRef<ShowAllProvidersHandle>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<SaveType | 'delete' | null>(null);
  const variant = props.variant || 'modal';
  const { mutate } = props;

  const {
    selectedIntegrations,
    date,
    setDate,
    tags,
    locked,
    current,
    setCurrent,
    channelDates,
    setChannelDate,
    internal,
    formatId,
    errors,
    setErrors,
    clearError,
  } = useLaunchStore(
    useShallow((state) => ({
      date: state.date,
      setDate: state.setDate,
      channelDates: state.channelDates,
      setChannelDate: state.setChannelDate,
      current: state.current,
      setCurrent: state.setCurrent,
      tags: state.tags,
      selectedIntegrations: state.selectedIntegrations,
      locked: state.locked,
      internal: state.internal,
      formatId: state.formatId,
      errors: state.errors,
      setErrors: state.setErrors,
      clearError: state.clearError,
    }))
  );

  // the other channels of an existing post show and move only their own date
  const channelDate = channelDates[current];
  const pickerDate = channelDate || date;
  const setPickerDate = useCallback(
    (newDate: dayjs.Dayjs) => {
      clearError('date');
      if (channelDate) {
        return setChannelDate(current, newDate);
      }
      setDate(newDate);
    },
    [channelDate, current]
  );

  // the channels the post already has, each with its own post
  const existingPosts = existingData.integration
    ? [existingData, ...(existingData.siblings || [])]
    : [];
  const isPublished = existingPosts.some(
    (p) => p.posts?.[0]?.state === 'PUBLISHED'
  );
  const isDraft = existingData.posts?.[0]?.state === 'DRAFT';

  const close = useCallback(async () => {
    if (
      await areYouSure({
        description: t(
          'are_you_sure_you_want_to_close_this_modal_all_data_will_be_lost'
        ),
        approveLabel: t('yes_close_it'),
        destructive: false,
      })
    ) {
      modal.closeAll();
    }
  }, []);

  const deletePost = useCallback(async () => {
    const channel =
      existingPosts.find((p) => p.integration === current) || existingData;
    let groups: string[] = [];

    if (existingData.siblings?.length) {
      const name = selectedIntegrations.find(
        (p) => p.integration.id === channel.integration
      )?.integration.name;
      groups = await new Promise<string[]>((resolve) => {
        modal.openModal({
          id: 'delete-post-channels',
          title: t('delete_post'),
          description: t('delete_post_from_all_channels_question'),
          size: 'sm',
          onClose: () => resolve([]),
          children: (closeDialog) => (
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  resolve([channel.group!]);
                  modal.closeById('delete-post-channels');
                }}
              >
                {t('delete_only_from')} {name}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  resolve(existingPosts.map((p) => p.group!));
                  modal.closeById('delete-post-channels');
                }}
              >
                {t('delete_from_all_channels')}
              </Button>
              <Button variant="ghost" onClick={closeDialog}>
                {t('cancel')}
              </Button>
            </div>
          ),
        });
      });
    } else if (
      await areYouSure({
        description: t('are_you_sure_you_want_to_delete_post'),
        approveLabel: t('yes_delete_it'),
      })
    ) {
      groups = [existingData.group!];
    }

    if (!groups.length) {
      return;
    }

    setLoading('delete');
    await Promise.all(
      groups.map((group) => fetch(`/posts/${group}`, { method: 'DELETE' }))
    );
    setLoading(null);
    mutate();
    toast.success(t('post_deleted_successfully'));
    modal.closeAll();
  }, [existingData, mutate, current, selectedIntegrations]);

  const validate = useCallback(
    async (type: SaveType) => {
      if (!selectedIntegrations.length) {
        return { found: { form: t('editor_pick_channel') } };
      }

      const results = await ref.current!.checkAllValid();
      const found: Record<string, string> = {};
      let invalidSettings: string | undefined;
      const isInternal = (id: string) =>
        internal.some((p) => p.integration.id === id);

      for (const item of results) {
        const name = selectedIntegrations.find(
          (p) => p.integration.id === item.id
        )!.integration.name;
        const key = isInternal(item.id) ? item.id : 'global';
        const content = plainText(item.values[0]?.content || '');

        if (!content.trim() && !item.values[0]?.media?.length) {
          found[key] ||= t('post_needs_content_or_image');
          continue;
        }

        // a draft gets these checks once it is scheduled
        if (type === 'draft') {
          continue;
        }

        const length = countLength(item.identifier, content);
        if (length > item.maximumCharacters) {
          found[key] ||= t('editor_too_long', {
            name,
            max: item.maximumCharacters.toLocaleString('de-DE'),
          });
        }

        if (!item.valid && !invalidSettings) {
          invalidSettings = item.id;
          found.form = t('editor_fix_settings', { name });
        }
      }

      if (
        type === 'schedule' &&
        !isPublished &&
        pickerDate.isBefore(newDayjs().subtract(1, 'minute'))
      ) {
        found.date = t('editor_date_in_past');
      }

      return { found, invalidSettings };
    },
    [selectedIntegrations, internal, pickerDate, isPublished]
  );

  const save = useCallback(
    (type: SaveType) => async () => {
      setErrors({});
      const { found, invalidSettings } = await validate(type);
      if (Object.keys(found).length) {
        setErrors(found);
        const channel = Object.keys(found).find(
          (key) => !['form', 'date'].includes(key)
        );
        if (channel) {
          setCurrent(channel);
        }
        requestAnimationFrame(() =>
          bodyRef.current
            ?.querySelector('[data-slot=field-error]')
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        );
        if (invalidSettings && !channel) {
          selectedIntegrations
            .find((p) => p.integration.id === invalidSettings)
            ?.ref?.current?.fix();
        }
        return;
      }

      if (
        type === 'now' &&
        !(await areYouSure({
          title: t('post_now'),
          description: t('editor_post_now_confirm', {
            count: selectedIntegrations.length,
          }),
          approveLabel: t('post_now'),
          destructive: false,
        }))
      ) {
        return;
      }

      if (
        type !== 'draft' &&
        isPublished &&
        !(await areYouSure({
          description: t('post_already_published_republish_warning'),
          approveLabel: t('republish_the_post'),
        }))
      ) {
        return;
      }

      setLoading(type);
      const results = await ref.current!.checkAllValid();
      const group = existingData.group || makeId(10);
      const posts = results.map((post) => ({
        integration: { id: post.id },
        // every channel of an existing post updates its own post
        group:
          existingPosts.find((p) => p.integration === post.id)?.group || group,
        ...(channelDates[post.id]
          ? {
              date: channelDates[post.id].utc().format('YYYY-MM-DDTHH:mm:ss'),
            }
          : {}),
        settings: post.settings,
        formatId,
        value: post.values.slice(0, 1).map((value) => ({
          ...(value.id ? { id: value.id } : {}),
          content: value.content,
          image: value.media.map(({ id, path }) => ({ id, path })),
        })),
      }));

      const response = await fetch('/posts', {
        method: 'POST',
        body: JSON.stringify({
          type,
          tags,
          date: date.utc().format('YYYY-MM-DDTHH:mm:ss'),
          posts,
        }),
      });
      setLoading(null);

      if (!response.ok) {
        const { message } = await response.json().catch(() => ({}));
        setErrors({
          form: Array.isArray(message)
            ? message.join(', ')
            : typeof message === 'string'
            ? message
            : t('post_save_failed'),
        });
        return;
      }

      const failed = (
        (await response.json().catch(() => [])) as {
          error?: string;
        }[]
      ).find((p) => p.error);

      mutate();
      const message =
        type === 'draft'
          ? t('editor_saved_draft')
          : type === 'now'
          ? t('editor_posted_now')
          : existingData.integration
          ? t('updated_successfully')
          : t('editor_scheduled');

      if (failed?.error) {
        toast.warning(failed.error);
      } else if (variant === 'page') {
        toast.success(message, {
          action: {
            label: t('editor_open_calendar'),
            onClick: () => router.push('/launches'),
          },
        });
      } else {
        toast.success(message);
      }

      if (variant === 'page') {
        props.onSaved?.();
      } else {
        modal.closeAll();
      }
    },
    [
      validate,
      tags,
      date,
      channelDates,
      selectedIntegrations,
      existingData,
      formatId,
      variant,
    ]
  );

  const busy = !!loading || locked;
  const scheduleLabel = !existingData.integration
    ? t('editor_schedule')
    : isDraft
    ? t('editor_schedule')
    : t('update');

  const publishCard = (
    <Card>
      <CardHeader>
        <CardTitle>{t('editor_publishing')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FormatSelect />
        <Field data-invalid={!!errors.date}>
          <FieldLabel>{t('editor_date')}</FieldLabel>
          <DateTimePicker
            date={pickerDate}
            onChange={setPickerDate}
            invalid={!!errors.date}
          />
          {!!channelDate && (
            <FieldDescription>
              {t('editor_channel_own_date', {
                name: selectedIntegrations.find(
                  (p) => p.integration.id === current
                )?.integration.name,
              })}
            </FieldDescription>
          )}
          <FieldError>{errors.date}</FieldError>
        </Field>
        <FieldError>{errors.form}</FieldError>
        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            disabled={busy}
            onClick={save('schedule')}
            className="w-full"
          >
            {loading === 'schedule' && <Spinner />}
            {scheduleLabel}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="lg"
              disabled={busy}
              onClick={save('draft')}
            >
              {loading === 'draft' && <Spinner />}
              {t('editor_save_draft')}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              disabled={busy}
              onClick={save('now')}
            >
              {loading === 'now' ? <Spinner /> : <SendIcon />}
              {t('editor_post_now')}
            </Button>
          </div>
          {!!existingData.integration && (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={deletePost}
              className="text-destructive hover:text-destructive"
            >
              {loading === 'delete' ? <Spinner /> : <Trash2Icon />}
              {t('delete_post')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // narrow layouts show the publish card last, so the main actions stay reachable at the bottom
  const actionBar = (
    <div className="sticky bottom-3 z-10 mt-4 flex gap-2 rounded-xl border bg-background/95 p-2 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/80 @4xl:hidden">
      <Button
        variant="outline"
        size="lg"
        disabled={busy}
        onClick={save('draft')}
        className="flex-1"
      >
        {loading === 'draft' && <Spinner />}
        {t('editor_save_draft')}
      </Button>
      <Button
        size="lg"
        disabled={busy}
        onClick={save('schedule')}
        className="flex-1"
      >
        {loading === 'schedule' && <Spinner />}
        {scheduleLabel}
      </Button>
    </div>
  );

  const body = (
    <div ref={bodyRef} className="@container">
      <div className="grid items-start gap-4 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <ShowAllProviders ref={ref} />
        <div className="flex min-w-0 flex-col gap-4">
          {!existingData.integration && (
            <Card>
              <CardHeader>
                <CardTitle>{t('editor_channels')}</CardTitle>
                <CardDescription>{t('editor_channels_hint')}</CardDescription>
                {!!selectedIntegrations.length && (
                  <CardAction>
                    <Badge variant="secondary">
                      {t('editor_selected', {
                        count: selectedIntegrations.length,
                      })}
                    </Badge>
                  </CardAction>
                )}
              </CardHeader>
              <CardContent>
                <PicksSocialsComponent />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>{t('editor_content')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ContentEditor />
            </CardContent>
          </Card>
          <SettingsCard />
        </div>
        <div
          className={cn(
            'flex min-w-0 flex-col gap-4 @4xl:sticky',
            variant === 'page' ? '@4xl:top-16' : '@4xl:top-0'
          )}
        >
          {publishCard}
          <PreviewCard />
        </div>
      </div>
      {actionBar}
    </div>
  );

  if (variant === 'page') {
    return (
      <PageBody>
        <PageHeader
          title={t('compose')}
          description={t('editor_page_description')}
        />
        {body}
      </PageBody>
    );
  }

  return (
    <ModalFrame
      title={
        existingData.integration
          ? t('editor_edit_post')
          : t('create_post_title')
      }
      onClose={close}
    >
      {body}
    </ModalFrame>
  );
};

const ModalFrame: FC<{
  title: string;
  onClose: () => void;
  children: ReactNode;
}> = ({ title, onClose, children }) => {
  const t = useT();
  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background">
      <div className="flex shrink-0 items-center gap-2 border-b px-4 py-3">
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('close')}
          onClick={onClose}
          className="ms-auto"
        >
          <XIcon />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30 p-3 md:p-5">
        {children}
      </div>
    </div>
  );
};
