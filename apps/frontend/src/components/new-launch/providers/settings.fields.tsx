'use client';

import { FC, useEffect, useState } from 'react';
import { useController } from 'react-hook-form';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@vibeschedule/frontend/components/ui/field';
import { Input } from '@vibeschedule/frontend/components/ui/input';
import { Switch } from '@vibeschedule/frontend/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@vibeschedule/frontend/components/ui/select';

// The fields of a channel's platform settings. Field names are the PfM
// platform_configurations keys (snake_case), see apps/cli/PLATFORM_SETTINGS.md.

const useFieldError = (name: string) => {
  const t = useT();
  const {
    fieldState: { error },
  } = useController({ name });
  return error?.message ? t(error.message) : undefined;
};

export const SettingsSelect: FC<{
  name: string;
  label: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}> = ({ name, label, defaultValue, options }) => {
  const t = useT();
  const { field } = useController({ name, defaultValue });
  const error = useFieldError(name);
  const id = `setting-${name}`;

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        items={options.map((option) => ({
          value: option.value,
          label: t(option.label),
        }))}
        value={field.value ?? defaultValue}
        onValueChange={(value) => field.onChange(value)}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {t(option.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError>{error}</FieldError>
    </Field>
  );
};

export const SettingsSwitch: FC<{
  name: string;
  label: string;
  description?: string;
  defaultValue: boolean;
}> = ({ name, label, description, defaultValue }) => {
  const { field } = useController({ name, defaultValue });
  const id = `setting-${name}`;

  return (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor={id} className="font-normal">
          {label}
        </FieldLabel>
        {description && <FieldDescription>{description}</FieldDescription>}
      </FieldContent>
      <Switch
        id={id}
        checked={!!field.value}
        onCheckedChange={(checked) => field.onChange(checked)}
      />
    </Field>
  );
};

const emptyToUndefined = (value: string) => value.trim() || undefined;

export const SettingsInput: FC<{
  name: string;
  label: string;
  description?: string;
  maxLength?: number;
}> = ({ name, label, description, maxLength }) => {
  const { field } = useController({ name });
  const error = useFieldError(name);
  const id = `setting-${name}`;

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        maxLength={maxLength}
        aria-invalid={!!error}
        value={field.value ?? ''}
        onChange={(e) => field.onChange(emptyToUndefined(e.target.value))}
        onBlur={field.onBlur}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError>{error}</FieldError>
    </Field>
  );
};

const toList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

// a comma separated list in the input, an array in the settings
export const SettingsListInput: FC<{
  name: string;
  label: string;
  description?: string;
}> = ({ name, label, description }) => {
  const { field } = useController({ name });
  const error = useFieldError(name);
  const id = `setting-${name}`;
  const joined = Array.isArray(field.value) ? field.value.join(', ') : '';
  const [text, setText] = useState(joined);

  useEffect(() => {
    if (toList(text).join(', ') !== joined) {
      setText(joined);
    }
  }, [joined]);

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        aria-invalid={!!error}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          field.onChange(toList(e.target.value));
        }}
        onBlur={field.onBlur}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError>{error}</FieldError>
    </Field>
  );
};
