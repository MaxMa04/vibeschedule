'use client';

import {
  DetailedHTMLProps,
  FC,
  forwardRef,
  SelectHTMLAttributes,
  useMemo,
} from 'react';
import { clsx } from 'clsx';
import { useFormContext } from 'react-hook-form';
import { RegisterOptions } from 'react-hook-form/dist/types/validator';

export const Select: FC<
  DetailedHTMLProps<
    SelectHTMLAttributes<HTMLSelectElement>,
    HTMLSelectElement
  > & {
    error?: any;
    extraForm?: RegisterOptions<any>;
    disableForm?: boolean;
    label: string;
    name: string;
    hideErrors?: boolean;
  }
> = forwardRef((props, ref) => {
  const {
    label,
    className,
    hideErrors,
    disableForm,
    error,
    extraForm,
    ...rest
  } = props;
  const form = useFormContext();
  const err = useMemo(() => {
    if (error) return error;
    if (!form || !form.formState.errors[props?.name!]) return;
    return form?.formState?.errors?.[props?.name!]?.message! as string;
  }, [form?.formState?.errors?.[props?.name!]?.message, error]);
  return (
    <div className={clsx('flex flex-col', label ? 'gap-[6px]' : '')}>
      <div className={`text-[14px]`}>{label}</div>
      <select
        ref={ref}
        {...(disableForm ? {} : form.register(props.name, extraForm))}
        className={clsx(
          'h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px]',
          className
        )}
        {...rest}
      />
      {!hideErrors && (
        <div className="text-error text-[12px]">{err || <>&nbsp;</>}</div>
      )}
    </div>
  );
});
