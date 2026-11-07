'use client';

import React, {
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AddEditModalProps } from '@vibeschedule/frontend/components/new-launch/add.edit.modal';
import clsx from 'clsx';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { PicksSocialsComponent } from '@vibeschedule/frontend/components/new-launch/picks.socials.component';
import { EditorWrapper } from '@vibeschedule/frontend/components/new-launch/editor';
import { SelectCurrent } from '@vibeschedule/frontend/components/new-launch/select.current';
import {
  Providers,
  ShowAllProviders,
} from '@vibeschedule/frontend/components/new-launch/providers/show.all.providers';
import { useExistingData } from '@vibeschedule/frontend/components/launches/helpers/use.existing.data';
import { useLaunchStore } from '@vibeschedule/frontend/components/new-launch/store';
import {
  DatePicker,
  DatePickerPanel,
} from '@vibeschedule/frontend/components/launches/helpers/date.picker';
import { useShallow } from 'zustand/react/shallow';
import { TagsComponent } from '@vibeschedule/frontend/components/launches/tags.component';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import { deleteDialog } from '@vibeschedule/react/helpers/delete.dialog';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { makeId } from '@vibeschedule/nestjs-libraries/services/make.is';
import { useModals } from '@vibeschedule/frontend/components/layout/new-modal';
import { SelectCustomer } from '@vibeschedule/frontend/components/launches/select.customer';
import {
  SettingsIcon,
  SettingsOutlineIcon,
  ChevronDownIcon,
  CloseIcon,
  TrashIcon,
  DropdownArrowSmallIcon,
  PlusIcon,
  EyeIcon,
  TagIcon,
} from '@vibeschedule/frontend/components/ui/icons';
import {
  MobileTopBar,
  MobileTopBarAction,
} from '@vibeschedule/frontend/components/new-launch/mobile.top.bar';
import {
  BottomSheet,
  BottomSheetButton,
  BottomSheetHeader,
  BottomSheetRow,
} from '@vibeschedule/frontend/components/ui/bottom.sheet.component';
import { useHasScroll } from '@vibeschedule/frontend/components/ui/is.scroll.hook';
import dayjs from 'dayjs';
import { Button } from '@vibeschedule/react/form/button';
import { stripHtmlValidation } from '@vibeschedule/helpers/utils/strip.html.validation';
import { countLength } from '@vibeschedule/helpers/utils/count.length';
import { useClickOutside } from '@mantine/hooks';

export const ManageModal: FC<AddEditModalProps> = (props) => {
  const t = useT();
  const fetch = useFetch();
  const ref = useRef(null);
  const existingData = useExistingData();
  const [loading, setLoading] = useState(false);
  const toaster = useToaster();
  const modal = useModals();
  const [showSettings, setShowSettings] = useState(false);
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const [mobileSheet, setMobileSheet] = useState<
    'channels' | 'settings' | 'tags' | 'date' | null
  >(null);
  const [showPostNow, setShowPostNow] = useState(false);
  const postNowRef = useClickOutside<HTMLDivElement>(() => {
    setShowPostNow(false);
  });
  const { mutate } = props;

  const {
    selectedIntegrations,
    hide,
    date,
    setDate,
    tags,
    setTags,
    integrations,
    setSelectedIntegrations,
    locked,
    current,
    setHide,
    channelDates,
    setChannelDate,
  } = useLaunchStore(
    useShallow((state) => ({
      hide: state.hide,
      setHide: state.setHide,
      date: state.date,
      setDate: state.setDate,
      channelDates: state.channelDates,
      setChannelDate: state.setChannelDate,
      current: state.current,
      tags: state.tags,
      setTags: state.setTags,
      selectedIntegrations: state.selectedIntegrations,
      integrations: state.integrations,
      setSelectedIntegrations: state.setSelectedIntegrations,
      locked: state.locked,
    }))
  );
  // the other channels of an existing post show and move only their own date
  const channelDate = channelDates[current];
  const pickerDate = channelDate || date;
  const setPickerDate = useCallback(
    (newDate: dayjs.Dayjs) => {
      if (channelDate) {
        return setChannelDate(current, newDate);
      }

      setDate(newDate);
    },
    [channelDate, current]
  );

  // the date sheet applies its changes only on save
  const [dateDraft, setDateDraft] = useState(date);

  // the channels the post already has, each with its own post
  const existingPosts = [existingData, ...(existingData.siblings || [])];
  // the channel in view, or the one that was opened
  const channel =
    existingPosts.find((p) => p.integration === current) || existingData;

  useEffect(() => {
    if (hide) {
      setHide(false);
    }
  }, [hide]);

  const currentIntegrationText = useMemo(() => {
    if (current === 'global') {
      return (
        <div className="flex items-center gap-[10px]">
          <div className="relative mobile:hidden">
            <SettingsIcon size={15} />
          </div>
          <div>{t('settings')}</div>
        </div>
      );
    }

    const currentIntegration = integrations.find((p) => p.id === current)!;

    return (
      <div className="flex items-center gap-[10px]">
        <div className="relative mobile:hidden">
          <img
            src={`/icons/platforms/${currentIntegration.identifier}.png`}
            className="w-[20px] h-[20px] rounded-[4px]"
            alt={currentIntegration.identifier}
          />
          <SettingsIcon
            size={15}
            className="absolute -end-[5px] -bottom-[5px]"
          />
        </div>
        <div>
          {currentIntegration.name} {t('channel_settings')}
        </div>
      </div>
    );
  }, [current]);

  const changeCustomer = useCallback(
    (customer: string) => {
      const neededIntegrations = integrations.filter(
        (p) => p?.customer?.id === customer
      );
      setSelectedIntegrations(
        neededIntegrations.map((p) => ({
          settings: {},
          selectedIntegrations: p,
        }))
      );
    },
    [integrations]
  );

  const askClose = useCallback(async () => {
    if (
      await deleteDialog(
        t('are_you_sure_you_want_to_close_this_modal_all_data_will_be_lost'),
        t('yes_close_it')
      )
    ) {
      modal.closeAll();
    }
  }, []);

  const deletePost = useCallback(async () => {
    setLoading(true);
    if (existingData.siblings?.length) {
      const groups = await new Promise<string[]>((resolve) => {
        modal.openModal({
          id: 'delete-post-channels',
          title: t('delete_post'),
          onClose: () => resolve([]),
          children: (
            <div className="flex flex-col">
              <div className="text-[20px] mb-[20px]">
                {t('delete_post_from_all_channels_question')}
              </div>
              <div className="flex w-full gap-[10px]">
                <div className="flex-1 flex">
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={() => {
                      modal.closeById('delete-post-channels');
                      resolve(existingPosts.map((p) => p.group!));
                    }}
                  >
                    {t('delete_from_all_channels')}
                  </Button>
                </div>
                <div className="flex-1 flex">
                  <Button
                    type="button"
                    secondary
                    className="flex-1"
                    onClick={() => {
                      modal.closeById('delete-post-channels');
                      resolve([channel.group!]);
                    }}
                  >
                    {t('delete_only_from')}{' '}
                    {
                      integrations.find((p) => p.id === channel.integration)
                        ?.name
                    }
                  </Button>
                </div>
              </div>
            </div>
          ),
        });
      });

      if (!groups.length) {
        setLoading(false);
        return;
      }

      await Promise.all(
        groups.map((group) =>
          fetch(`/posts/${group}`, {
            method: 'DELETE',
          })
        )
      );
      mutate();
      modal.closeAll();
      return;
    }

    if (
      !(await deleteDialog(
        t('are_you_sure_you_want_to_delete_post'),
        t('yes_delete_it')
      ))
    ) {
      setLoading(false);
      return;
    }
    await fetch(`/posts/${existingData.group}`, {
      method: 'DELETE',
    });
    mutate();
    modal.closeAll();
    return;
  }, [existingData, mutate, modal, current, integrations]);

  const schedule = useCallback(
    (type: 'draft' | 'now' | 'schedule') => async () => {
      const checkAllValid = await ref.current.checkAllValid();

      for (const item of checkAllValid) {
        const integration = selectedIntegrations.find(
          (p) => p.integration.id === item.id
        );
        const content = stripHtmlValidation(
          'normal',
          item.values[0]?.content || '',
          true
        );

        if (!content.trim() && !item.values[0]?.media?.length) {
          toaster.show(
            `${item.integration.name}: ${t('post_needs_content_or_image')}`,
            'warning'
          );
          integration?.ref?.current?.preview();
          return;
        }

        // a draft gets these checks once it is scheduled
        if (type === 'draft') {
          continue;
        }

        if (!item.valid) {
          toaster.show(
            `${item.integration.name}: ${t('please_fix_your_settings')}`,
            'warning'
          );
          integration?.ref?.current?.fix();
          setShowSettings(true);
          return;
        }

        if (countLength(item.identifier, content) > item.maximumCharacters) {
          toaster.show(
            `${item.integration.name}: ${t('post_is_too_long')}`,
            'warning'
          );
          integration?.ref?.current?.preview();
          return;
        }
      }

      if (
        type !== 'draft' &&
        existingPosts.some((p) => p.posts?.[0]?.state === 'PUBLISHED') &&
        !(await deleteDialog(
          t('post_already_published_republish_warning'),
          t('republish_the_post')
        ))
      ) {
        return;
      }

      setLoading(true);

      const group = existingData.group || makeId(10);
      const posts = checkAllValid.map((post: any) => ({
        integration: {
          id: post.id,
        },
        // every channel of an existing post updates its own post
        group:
          existingPosts.find((p) => p.integration === post.id)?.group || group,
        ...(channelDates[post.id]
          ? {
              date: channelDates[post.id].utc().format('YYYY-MM-DDTHH:mm:ss'),
            }
          : {}),
        settings: post.settings,
        value: post.values.slice(0, 1).map((value: any) => ({
          ...(value.id ? { id: value.id } : {}),
          content: value.content,
          image: value.media.map(({ id, path }: any) => ({ id, path })),
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

      if (!response.ok) {
        const { message } = await response.json().catch(() => ({}));
        toaster.show(
          typeof message === 'string' ? message : t('post_save_failed'),
          'warning'
        );
        setLoading(false);
        return;
      }

      mutate();
      toaster.show(
        !existingData.integration
          ? t('added_successfully')
          : t('updated_successfully')
      );
      modal.closeAll();
    },
    [tags, date, channelDates, selectedIntegrations, existingData]
  );

  const scheduleLabel = !existingData?.integration
    ? t('add_to_calendar')
    : existingData?.posts?.[0]?.state === 'DRAFT'
    ? t('schedule')
    : t('update');

  const mobileActions: MobileTopBarAction[] = [
    {
      label: scheduleLabel,
      variant: 'primary',
      onClick: schedule('schedule'),
    },
    {
      label: t('post_now'),
      variant: 'secondary',
      onClick: schedule('now'),
    },
    {
      label: t('save_as_draft'),
      variant: 'tertiary',
      onClick: schedule('draft'),
    },
  ];

  // the settings sheet links to the channel settings only when there are any
  const hasChannelSettings = useMemo(() => {
    const identifiers =
      current === 'global'
        ? selectedIntegrations.map((p) => p.integration.identifier)
        : [integrations.find((p) => p.id === current)?.identifier];

    return identifiers.some(
      (identifier) =>
        Providers.find((p) => p.identifier === identifier)?.component
          .hasSettings
    );
  }, [current, selectedIntegrations, integrations]);

  // on phones, the settings, tags and delete live in a settings sheet
  const settingsButton = (
    <div
      onClick={() => setMobileSheet('settings')}
      className="hidden mobile:flex shrink-0 w-[32px] h-[44px] justify-end items-center cursor-pointer text-textItemBlur"
    >
      <SettingsOutlineIcon />
    </div>
  );

  // phones have no room for the preview column, it replaces the editor instead
  const previewButton = (
    <div
      onClick={() => setMobileTab(mobileTab === 'preview' ? 'edit' : 'preview')}
      className={clsx(
        'hidden mobile:flex shrink-0 w-[32px] h-[44px] justify-end items-center cursor-pointer',
        mobileTab === 'preview' ? 'text-teal' : 'text-textItemBlur'
      )}
    >
      <EyeIcon />
    </div>
  );

  return (
    <div className="w-full h-full flex-1 p-[40px] mobile:p-0 mobile:h-auto mobile:min-h-full flex relative">
      <div className="flex flex-1 min-w-0 bg-newBgColorInner rounded-[20px] mobile:rounded-none flex-col">
        <MobileTopBar
          onBack={askClose}
          actions={mobileActions}
          disabled={selectedIntegrations.length === 0 || loading || locked}
          loading={loading}
        >
          <DatePicker
            onChange={setPickerDate}
            date={pickerDate}
            onOpen={() => {
              setDateDraft(pickerDate);
              setMobileSheet('date');
            }}
          />
        </MobileTopBar>
        <div className="flex-1 flex mobile:contents">
          <div
            className={clsx(
              'flex flex-col flex-1 min-w-0 border-e border-newBorder mobile:border-e-0',
              mobileTab === 'preview' && 'mobile:flex-none'
            )}
          >
            <div className="bg-newBgColor h-[65px] rounded-s-[20px] !rounded-b-[0] mobile:hidden flex items-center gap-[12px] px-[20px] text-[20px] font-display font-bold tracking-tight">
              {t('create_post_title')}
            </div>
            <div className="flex-1 flex flex-col gap-[16px]">
              <div
                className={clsx(
                  // mobile:flex wins over hidden, the settings sheet opens above the editor on phones
                  'flex-1 relative mobile:flex mobile:flex-col',
                  showSettings && 'hidden'
                )}
              >
                <div
                  id="social-content"
                  className="gap-[32px] mobile:gap-[16px] flex flex-col pe-[8px] pt-[20px] ps-[20px] mobile:px-[16px] mobile:pt-[12px] mobile:static mobile:flex-1 absolute top-0 left-0 w-full h-full mobile:h-auto overflow-x-hidden overflow-y-scroll mobile:overflow-y-visible scrollbar scrollbar-thumb-newColColor scrollbar-track-newBgColorInner"
                >
                  <div
                    className={clsx(
                      'flex w-full',
                      !existingData.integration && 'mobile:hidden'
                    )}
                  >
                    <div className="flex flex-1">
                      <PicksSocialsComponent toolTip={true} />
                    </div>
                    <div className="mobile:hidden">
                      {/* an existing post keeps its channels */}
                      {!existingData.integration && (
                        <SelectCustomer
                          onChange={changeCustomer}
                          integrations={integrations}
                        />
                      )}
                    </div>
                    {!!existingData.integration && (
                      <>
                        {previewButton}
                        {settingsButton}
                      </>
                    )}
                  </div>
                  <div className="flex flex-1 gap-[6px] mobile:gap-[16px] flex-col">
                    <div className="flex mobile:items-center mobile:gap-[4px]">
                      <div className="flex-1 mobile:flex-initial mobile:min-w-0">
                        {(!existingData.integration ||
                          !!existingData.siblings?.length) && <SelectCurrent />}
                      </div>
                      {!existingData.integration && (
                        <>
                          <div
                            onClick={() => setMobileSheet('channels')}
                            className="hidden mobile:flex shrink-0 w-[44px] h-[44px] rounded-[8px] bg-btnSimple justify-center items-center cursor-pointer"
                          >
                            <PlusIcon size={24} />
                          </div>
                          <div className="hidden mobile:block flex-1" />
                          {previewButton}
                          {settingsButton}
                        </>
                      )}
                    </div>
                    <div
                      className={clsx(
                        'flex-1 flex',
                        mobileTab === 'preview' && 'mobile:hidden'
                      )}
                    >
                      {!hide && <EditorWrapper />}
                    </div>
                    <div
                      id="social-empty"
                      className={clsx(
                        'pb-[16px] mobile:pb-0'
                        // current !== 'global' && 'hidden'
                      )}
                    />
                  </div>
                </div>
              </div>
              {/* on phones the settings open as a bottom sheet */}
              <div
                className={clsx('contents', !showSettings && 'mobile:hidden')}
              >
                {showSettings && (
                  <div
                    onClick={() => setShowSettings(false)}
                    className="hidden mobile:block fixed inset-0 z-[599] bg-popup backdrop-blur-[8px] animate-fadeIn touch-none"
                  />
                )}
                <div
                  id="wrapper-settings"
                  className={clsx(
                    'pb-[20px] px-[20px] select-none',
                    showSettings &&
                      'flex-1 flex pt-[20px] mobile:fixed mobile:inset-x-0 mobile:bottom-0 mobile:z-[600] mobile:max-h-[90%] mobile:p-0',
                    current === 'global' && 'hidden'
                  )}
                >
                  <div className="flex-1 flex flex-col rounded-[12px] gap-[12px] overflow-hidden bg-newSettings mobile:rounded-none mobile:rounded-t-[24px] mobile:gap-0 mobile:pt-[8px] mobile:pb-[24px] mobile:bg-newBgColorInner mobile:animate-fade">
                    <div className="hidden mobile:contents">
                      <BottomSheetHeader
                        title={currentIntegrationText}
                        onClose={() => setShowSettings(false)}
                      />
                    </div>
                    <div
                      onClick={() => setShowSettings(!showSettings)}
                      className={clsx(
                        'bg-btnSimple rounded-[12px] flex items-center gap-[8px] cursor-pointer p-[12px] mobile:hidden',
                        showSettings ? '!rounded-b-none' : ''
                      )}
                    >
                      <div className="flex-1 text-[14px] font-[600] text-btnText">
                        {currentIntegrationText}
                      </div>
                      <div>
                        <ChevronDownIcon
                          rotated={showSettings}
                          className="text-btnText"
                        />
                      </div>
                    </div>
                    <div
                      className={clsx(
                        !showSettings ? 'hidden' : 'flex-1',
                        'text-[14px] text-textColor font-[500] relative mobile:min-h-0 mobile:overflow-y-auto mobile:overscroll-contain'
                      )}
                    >
                      <div className="absolute mobile:static left-0 top-0 w-full h-full mobile:h-auto flex flex-col overflow-x-hidden overflow-y-auto scrollbar scrollbar-thumb-newBgColorInner scrollbar-track-newColColor">
                        <div
                          id="social-settings"
                          className="flex flex-col gap-[20px] bg-newBgColor mobile:bg-transparent"
                        />
                      </div>
                    </div>
                    <div className="hidden mobile:contents">
                      <BottomSheetButton
                        label={t('done')}
                        onClick={() => setShowSettings(false)}
                      />
                    </div>
                    <style>
                      {`#social-settings [data-id="${current}"] {display: block !important;}`}
                    </style>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            className={clsx(
              'w-[580px] tablet:w-[440px] mobile:!w-full flex flex-col mobile:flex-1',
              mobileTab === 'edit' && 'mobile:hidden'
            )}
          >
            <div className="bg-newBgColor h-[65px] rounded-e-[20px] !rounded-b-[0] mobile:hidden flex items-center px-[20px] text-[20px] font-[600]">
              <div className="flex-1 font-display font-bold tracking-tight">
                {t('post_preview')}
              </div>
              <div className="cursor-pointer mobile:hidden">
                <CloseIcon onClick={askClose} className="text-textItemBlur" />
              </div>
            </div>
            <div className="flex-1 relative">
              <Scrollable
                scrollClasses="!pe-[20px]"
                className="absolute mobile:static top-0 p-[20px] pe-[8px] mobile:p-[16px] left-0 w-full h-full mobile:h-auto overflow-x-hidden overflow-y-scroll mobile:overflow-y-visible scrollbar scrollbar-thumb-newColColor scrollbar-track-newBgColorInner"
              >
                <ShowAllProviders ref={ref} />
              </Scrollable>
            </div>
          </div>
        </div>
        <div className="select-none h-[84px] py-[20px] border-t border-newBorder flex items-center mobile:hidden">
          <div className="flex-1 flex ps-[20px] gap-[8px]">
            {/* keep a single tags component mounted, the tags sheet has its own */}
            {mobileSheet !== 'tags' && (
              <TagsComponent
                name="tags"
                label={t('tags')}
                initial={tags}
                onChange={(e) => {
                  setTags(e.target.value);
                }}
              />
            )}
          </div>
          <div className="pe-[20px] flex items-center justify-end gap-[8px]">
            {existingData?.integration && (
              <button
                onClick={deletePost}
                className="cursor-pointer flex text-error gap-[8px] items-center text-[15px] font-[600]"
              >
                <div>
                  <TrashIcon />
                </div>
                <div>{t('delete_post')}</div>
              </button>
            )}
            <DatePicker onChange={setPickerDate} date={pickerDate} />
            <button
              disabled={selectedIntegrations.length === 0 || loading || locked}
              onClick={schedule('draft')}
              className="relative cursor-pointer disabled:cursor-not-allowed px-[20px] h-[44px] border border-newBorder bg-transparent justify-center items-center flex rounded-[12px] text-[15px] font-[600]"
            >
              {loading && (
                <div className="absolute left-[50%] top-[50%] -translate-y-[50%] -translate-x-[50%]">
                  <div className="animate-spin h-[20px] w-[20px] border-4 border-textColor border-t-transparent rounded-full" />
                </div>
              )}
              <div className={clsx(loading && 'invisible')}>
                {t('save_as_draft')}
              </div>
            </button>
            <div ref={postNowRef} className="group cursor-pointer relative">
              <button
                disabled={
                  selectedIntegrations.length === 0 || loading || locked
                }
                onClick={schedule('schedule')}
                className="text-surface relative min-w-[180px] disabled:cursor-not-allowed disabled:opacity-80 outline-none gap-[8px] flex justify-center items-center h-[44px] rounded-[12px] bg-ink ps-[20px] pe-[16px]"
              >
                {loading && (
                  <div className="absolute left-[50%] top-[50%] -translate-y-[50%] -translate-x-[50%]">
                    <div className="animate-spin h-[20px] w-[20px] border-4 border-surface border-t-transparent rounded-full" />
                  </div>
                )}
                <div
                  className={clsx(
                    'text-[15px] font-[600]',
                    loading && 'invisible'
                  )}
                >
                  {selectedIntegrations.length === 0
                    ? t('check_circles_above')
                    : scheduleLabel}
                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPostNow(!showPostNow);
                  }}
                  className="flex justify-center items-center h-[20px] w-[20px] pt-[4px]"
                >
                  <DropdownArrowSmallIcon
                    className={clsx(
                      'group-hover:rotate-180 text-surface',
                      showPostNow && 'rotate-180'
                    )}
                  />
                </div>
              </button>
              <button
                onClick={schedule('now')}
                disabled={
                  selectedIntegrations.length === 0 || loading || locked
                }
                className={clsx(
                  'rounded-[12px] z-[300] disabled:cursor-not-allowed disabled:opacity-80 absolute bottom-[100%] -left-[12px] p-[12px] w-[206px] bg-newBgColorInner border border-newBorder',
                  showPostNow ? 'flex' : 'hidden group-hover:flex'
                )}
              >
                <div className="text-white rounded-[12px] bg-coral hover:bg-coral-hover h-[44px] w-full flex justify-center items-center">
                  {t('post_now')}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
      {mobileSheet === 'channels' && (
        <BottomSheet
          title={t('select_channels')}
          onClose={() => setMobileSheet(null)}
          button={{
            label: t('done'),
            onClick: () => setMobileSheet(null),
            disabled: selectedIntegrations.length === 0,
          }}
        >
          <div className="flex pb-[8px] empty:hidden">
            <SelectCustomer
              onChange={changeCustomer}
              integrations={integrations}
            />
          </div>
          <PicksSocialsComponent list={true} />
        </BottomSheet>
      )}
      {mobileSheet === 'settings' && (
        <BottomSheet title={t('settings')} onClose={() => setMobileSheet(null)}>
          <div className="flex flex-col gap-[12px] pb-[30px]">
            {hasChannelSettings && (
              <BottomSheetRow
                icon={<SettingsOutlineIcon size={24} />}
                label={
                  current === 'global'
                    ? t('channels_settings')
                    : `${integrations.find((p) => p.id === current)?.name} ${t(
                        'channel_settings'
                      )}`
                }
                onClick={() => {
                  setMobileSheet(null);
                  setShowSettings(true);
                }}
              />
            )}
            <BottomSheetRow
              icon={<TagIcon width={24} height={24} />}
              label={t('add_tag')}
              onClick={() => setMobileSheet('tags')}
            />
            {existingData?.integration && (
              <div
                onClick={deletePost}
                className="flex items-center gap-[12px] py-[8px] cursor-pointer text-error"
              >
                <TrashIcon size={24} />
                <div className="text-[15px] font-[600]">{t('delete_post')}</div>
              </div>
            )}
          </div>
        </BottomSheet>
      )}
      {mobileSheet === 'tags' && (
        <BottomSheet
          title={t('add_tag')}
          onClose={() => setMobileSheet(null)}
          button={{
            label: t('done'),
            onClick: () => setMobileSheet(null),
          }}
        >
          <TagsComponent
            name="tags"
            label={t('tags')}
            initial={tags}
            onChange={(e) => {
              setTags(e.target.value);
            }}
            list={true}
          />
        </BottomSheet>
      )}
      {mobileSheet === 'date' && (
        <BottomSheet
          title={t('change_date_or_time')}
          onClose={() => setMobileSheet(null)}
          button={{
            label: t('save'),
            onClick: () => {
              setPickerDate(dateDraft);
              setMobileSheet(null);
            },
          }}
        >
          <DatePickerPanel
            date={dateDraft}
            onChange={setDateDraft}
            sheet={true}
          />
        </BottomSheet>
      )}
    </div>
  );
};

const Scrollable: FC<{
  className: string;
  scrollClasses: string;
  children: ReactNode;
}> = ({ className, scrollClasses, children }) => {
  const ref = useRef(undefined);
  const hasScroll = useHasScroll(ref);
  return (
    <div className={clsx(className, hasScroll && scrollClasses)} ref={ref}>
      {children}
    </div>
  );
};
