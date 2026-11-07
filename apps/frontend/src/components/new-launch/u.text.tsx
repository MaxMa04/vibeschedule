'use client';

import { FC } from 'react';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';

export const UText: FC<{
  editor: any;
  currentValue: string;
}> = ({ editor }) => {
  const t = useT();
  const mark = () => {
    editor?.commands?.unsetBold();
    editor?.commands?.toggleUnderline();
    editor?.commands?.focus();
  };
  return (
    <div
      data-tooltip-id="tooltip"
      data-tooltip-content={t('underline_text')}
      onClick={mark}
      className="select-none cursor-pointer rounded-[6px] mobile:rounded-[8px] w-[30px] h-[30px] mobile:w-[40px] mobile:h-[40px] bg-newColColor mobile:bg-newSettings flex justify-center items-center"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        className="mobile:w-[20px] mobile:h-[20px]"
        viewBox="0 0 16 16"
        fill="none"
      >
        <path
          d="M11.9993 2.66699V7.33366C11.9993 9.5428 10.2085 11.3337 7.99935 11.3337C5.79021 11.3337 3.99935 9.5428 3.99935 7.33366V2.66699M2.66602 14.0003H13.3327"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
