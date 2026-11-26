'use client';

import React, { FC, forwardRef, useImperativeHandle, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { IsOptional } from 'class-validator';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { useShallow } from 'zustand/react/shallow';
import { useLaunchStore } from '@vibeschedule/frontend/components/new-launch/store';
import { useEditorSlots } from '@vibeschedule/frontend/components/new-launch/slots';
import { GeneralPreview } from '@vibeschedule/frontend/components/new-launch/providers/general.preview';
import { IntegrationContext } from '@vibeschedule/frontend/components/launches/helpers/use.integration';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';

class Empty {
  @IsOptional()
  empty: string;
}

export interface ProviderHandle {
  isValid: () => Promise<{
    id: string;
    identifier: string;
    valid: boolean;
    settings: Record<string, any>;
    values: { id: string; content: string; media: { id: string; path: string }[] }[];
    maximumCharacters: number;
  }>;
  trigger: () => Promise<boolean>;
  // brings the channel's settings into view, showing what is wrong
  fix: () => void;
}

// The settings form values are stored as the channel's `settings` and the
// backend passes them unchanged as PfM platform_configurations[platform],
// so form field names must be PfM's snake_case keys.
export const withProvider = function (params: {
  SettingsComponent: FC | null;
  CustomPreviewComponent?: FC<{
    maximumCharacters?: number;
  }>;
  dto?: any;
  maximumCharacters: number;
}) {
  const { SettingsComponent, CustomPreviewComponent, dto, maximumCharacters } =
    params;

  const Wrapped = forwardRef<ProviderHandle, { id: string }>((props, ref) => {
    const t = useT();
    const { internal, global, date, allIntegrations, selectedIntegration } =
      useLaunchStore(
        useShallow((state) => ({
          date: state.channelDates[props.id] || state.date,
          global: state.global,
          internal: state.internal.find((p) => p.integration.id === props.id),
          allIntegrations: state.integrations,
          selectedIntegration: state.selectedIntegrations.find(
            (p) => p.integration.id === props.id
          )!,
        }))
      );
    const { settingsSlot, previewSlot } = useEditorSlots(
      useShallow((state) => ({
        settingsSlot: state.settings[props.id],
        previewSlot: state.previewId === props.id ? state.preview : null,
      }))
    );

    const value = useMemo(
      () =>
        internal?.integrationValue?.length ? internal.integrationValue : global,
      [internal, global]
    );

    const form = useForm({
      resolver: classValidatorResolver(dto || Empty),
      ...(Object.keys(selectedIntegration.settings || {}).length > 0
        ? { values: { ...selectedIntegration.settings } }
        : {}),
      mode: 'all',
      criteriaMode: 'all',
      reValidateMode: 'onChange',
    });

    useImperativeHandle(
      ref,
      () => ({
        isValid: async () => ({
          id: props.id,
          identifier: selectedIntegration.integration.identifier,
          valid: await form.trigger(),
          settings: form.getValues(),
          values: value,
          maximumCharacters,
        }),
        trigger: () => form.trigger(),
        fix: () => {
          form.trigger();
          settingsSlot?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        },
      }),
      [value, settingsSlot, selectedIntegration]
    );

    const Preview = CustomPreviewComponent || GeneralPreview;
    const hasContent =
      !!value?.[0]?.content?.replace(/<[^>]*>/g, '').trim() ||
      !!value?.[0]?.media?.length;

    return (
      <IntegrationContext.Provider
        value={{
          date,
          integration: selectedIntegration.integration,
          allIntegrations,
          value: value.map((p) => ({
            id: p.id,
            content: p.content,
            image: p.media,
          })),
        }}
      >
        <FormProvider {...form}>
          {SettingsComponent &&
            settingsSlot &&
            createPortal(<SettingsComponent />, settingsSlot)}
          {previewSlot &&
            createPortal(
              hasContent ? (
                <Preview maximumCharacters={maximumCharacters} />
              ) : (
                <div className="flex min-h-40 items-center justify-center p-6 text-center text-sm text-muted-foreground">
                  {t('start_writing_your_post')}
                </div>
              ),
              previewSlot
            )}
        </FormProvider>
      </IntegrationContext.Provider>
    );
  });

  return Object.assign(Wrapped, {
    hasSettings: !!SettingsComponent,
    maximumCharacters,
  });
};
