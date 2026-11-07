'use client';

import React, {
  FC,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
} from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { IsOptional } from 'class-validator';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { useLaunchStore } from '@vibeschedule/frontend/components/new-launch/store';
import { useShallow } from 'zustand/react/shallow';
import { GeneralPreviewComponent } from '@vibeschedule/frontend/components/launches/general.preview.component';
import { IntegrationContext } from '@vibeschedule/frontend/components/launches/helpers/use.integration';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import SafeImage from '@vibeschedule/react/helpers/safe.image';

class Empty {
  @IsOptional()
  empty: string;
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

  const Wrapped = forwardRef((props: { id: string }, ref) => {
    const t = useT();
    const {
      current,
      selectedIntegration,
      setCurrent,
      internal,
      global,
      date,
      isGlobal,
      setTotalChars,
      allIntegrations,
      setChars,
      setHide,
    } = useLaunchStore(
      useShallow((state) => ({
        date: state.channelDates[props.id] || state.date,
        global: state.global,
        internal: state.internal.find((p) => p.integration.id === props.id),
        setHide: state.setHide,
        allIntegrations: state.integrations,
        current: state.current === props.id,
        isGlobal: state.current === 'global',
        setCurrent: state.setCurrent,
        setTotalChars: state.setTotalChars,
        setChars: state.setChars,
        selectedIntegration: state.selectedIntegrations.find(
          (p) => p.integration.id === props.id
        )!,
      }))
    );

    useEffect(() => {
      setChars(props.id, maximumCharacters);
      if (isGlobal) {
        setTotalChars(0);
      }
      if (current) {
        setTotalChars(maximumCharacters);
      }
    }, [current, isGlobal]);

    const value = useMemo(() => {
      if (internal?.integrationValue?.length) {
        return internal.integrationValue;
      }

      return global;
    }, [internal, global]);

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
        isValid: async () => {
          return {
            id: props.id,
            identifier: selectedIntegration.integration.identifier,
            integration: selectedIntegration.integration,
            valid: await form.trigger(),
            err: form.formState.errors,
            settings: form.getValues(),
            values: value,
            maximumCharacters,
          };
        },
        getValues: () => {
          return {
            id: props.id,
            identifier: selectedIntegration.integration.identifier,
            values: value,
            settings: form.getValues(),
          };
        },
        trigger: () => {
          return form.trigger();
        },
        // a save that failed on this channel brings it into view, with its
        // settings showing what is wrong
        fix: () => {
          setCurrent(props.id);
          setHide(true);
          form.trigger();
        },
        preview: () => {
          setCurrent(props.id);
          setHide(true);
        },
      }),
      [value]
    );

    const Preview = CustomPreviewComponent || GeneralPreviewComponent;

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
          <div
            className={clsx(
              'border border-borderPreview rounded-[20px] shadow-previewShadow',
              !current && 'hidden'
            )}
          >
            {current && !value?.[0]?.content?.length && (
              <div className="p-[16px] text-textItemBlur">
                {t('start_writing_your_post')}
              </div>
            )}
            {current && !!value?.[0]?.content?.length && (
              <Preview maximumCharacters={maximumCharacters} />
            )}
            {SettingsComponent &&
              createPortal(
                <div
                  data-id={props.id}
                  className={
                    isGlobal
                      ? 'bg-newSettings pb-[12px] px-[12px] mobile:bg-transparent mobile:px-[16px]'
                      : 'hidden bg-newSettings px-[12px] pb-[12px] mobile:bg-transparent mobile:px-[16px]'
                  }
                >
                  {isGlobal && (
                    <style>{`#wrapper-settings {display: flex !important} #social-empty {display: block !important;}`}</style>
                  )}
                  {isGlobal && (
                    <div className="flex py-[20px] items-center gap-[15px]">
                      <div className="relative">
                        <SafeImage
                          alt={selectedIntegration.integration.name}
                          width={42}
                          height={42}
                          className="min-w-[42px] min-h-[42px] w-[42px] h-[42px] rounded-full"
                          src={
                            selectedIntegration.integration.picture ||
                            '/no-picture.jpg'
                          }
                        />
                        <SafeImage
                          alt={selectedIntegration.integration.identifier}
                          width={16}
                          height={16}
                          className="rounded-[16px] min-w-[16px] min-h-[16px] w-[16px] h-[16px] absolute bottom-0 end-0"
                          src={`/icons/platforms/${selectedIntegration.integration.identifier}.png`}
                        />
                      </div>
                      <div className="text-[20px]">
                        {selectedIntegration.integration.name}
                      </div>
                    </div>
                  )}
                  <SettingsComponent />
                </div>,
                document.querySelector('#social-settings') ||
                  document.createElement('div')
              )}
            {current &&
              !SettingsComponent &&
              createPortal(
                <style>{`#wrapper-settings {display: none !important;} #social-empty {display: block !important;}`}</style>,
                document.querySelector('#social-settings') ||
                  document.createElement('div')
              )}
          </div>
        </FormProvider>
      </IntegrationContext.Provider>
    );
  });

  return Object.assign(Wrapped, { hasSettings: !!SettingsComponent });
};
