'use client';

import { FC } from 'react';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';

export const BoldText: FC<{
  editor: any;
  currentValue: string;
}> = ({ editor }) => {
  const t = useT();
  const mark = () => {
    editor?.commands?.unsetUnderline();
    editor?.commands?.toggleBold();
    editor?.commands?.focus();
  };
  return (
    <div
      data-tooltip-id="tooltip"
      data-tooltip-content={t('bold_text')}
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
          d="M4 8.00033H9.33333C10.8061 8.00033 12 6.80642 12 5.33366C12 3.8609 10.8061 2.66699 9.33333 2.66699H4V8.00033ZM4 8.00033H10C11.4728 8.00033 12.6667 9.19423 12.6667 10.667C12.6667 12.1398 11.4728 13.3337 10 13.3337H4V8.00033Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
