'use client';

import { FC, useMemo } from 'react';
import useSWR from 'swr';
import { useShallow } from 'zustand/react/shallow';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { useLaunchStore } from '@vibeschedule/frontend/components/new-launch/store';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@vibeschedule/frontend/components/ui/select';
import {
  Field,
  FieldDescription,
  FieldLabel,
} from '@vibeschedule/frontend/components/ui/field';

export interface FormatListItem {
  id: string;
  name: string;
  description: string | null;
  integrations: {
    integrationId: string;
    status: 'ACTIVE' | 'TESTING' | 'PAUSED';
  }[];
}

const NONE = 'none';

export const useFormats = () => {
  const fetch = useFetch();
  return useSWR<FormatListItem[]>('/formats', async (path: string) => {
    const response = await fetch(path);
    return response.ok ? response.json() : [];
  });
};

// the format the post belongs to; formats running on the selected channels
// come first
export const FormatSelect: FC = () => {
  const t = useT();
  const { data: formats = [] } = useFormats();
  const { formatId, setFormatId, selectedIntegrations } = useLaunchStore(
    useShallow((state) => ({
      formatId: state.formatId,
      setFormatId: state.setFormatId,
      selectedIntegrations: state.selectedIntegrations,
    }))
  );

  const { running, others } = useMemo(() => {
    const ids = selectedIntegrations.map((p) => p.integration.id);
    const isRunning = (format: FormatListItem) =>
      format.integrations.some(
        (p) => ids.includes(p.integrationId) && p.status !== 'PAUSED'
      );
    return {
      running: formats.filter(isRunning),
      others: formats.filter((format) => !isRunning(format)),
    };
  }, [formats, selectedIntegrations]);

  const testing = (format: FormatListItem) =>
    format.integrations.some(
      (p) =>
        p.status === 'TESTING' &&
        selectedIntegrations.some((s) => s.integration.id === p.integrationId)
    );

  const items = [
    { value: NONE, label: t('editor_no_format') },
    ...formats.map((format) => ({ value: format.id, label: format.name })),
  ];
  const selected = formats.find((format) => format.id === formatId);

  const renderItem = (format: FormatListItem) => (
    <SelectItem key={format.id} value={format.id}>
      {format.name}
      {testing(format) && (
        <span className="text-xs text-muted-foreground">
          {t('editor_format_testing')}
        </span>
      )}
    </SelectItem>
  );

  return (
    <Field>
      <FieldLabel htmlFor="post-format">{t('editor_format')}</FieldLabel>
      <Select
        items={items}
        value={formatId || NONE}
        onValueChange={(value) =>
          setFormatId(!value || value === NONE ? null : String(value))
        }
      >
        <SelectTrigger id="post-format" className="h-9 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{t('editor_no_format')}</SelectItem>
          {!!running.length && (
            <>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>{t('editor_formats_on_channels')}</SelectLabel>
                {running.map(renderItem)}
              </SelectGroup>
            </>
          )}
          {!!others.length && (
            <>
              <SelectSeparator />
              <SelectGroup>
                {!!running.length && (
                  <SelectLabel>{t('editor_formats_other')}</SelectLabel>
                )}
                {others.map(renderItem)}
              </SelectGroup>
            </>
          )}
        </SelectContent>
      </Select>
      {!!selected?.description && (
        <FieldDescription className="line-clamp-2">
          {selected.description}
        </FieldDescription>
      )}
    </Field>
  );
};
