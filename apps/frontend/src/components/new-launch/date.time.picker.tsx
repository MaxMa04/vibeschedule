'use client';

import { FC, useState } from 'react';
import dayjs from 'dayjs';
import { de } from 'react-day-picker/locale';
import { CalendarIcon } from 'lucide-react';
import {
  newDayjs,
  toPickerDate,
} from '@vibeschedule/frontend/components/layout/set.timezone';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import { Calendar } from '@vibeschedule/frontend/components/ui/calendar';
import { Input } from '@vibeschedule/frontend/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@vibeschedule/frontend/components/ui/popover';

// date and time in the user's timezone; the calendar works with native
// dates, so it gets and gives the wall clock
export const DateTimePicker: FC<{
  date: dayjs.Dayjs;
  onChange: (date: dayjs.Dayjs) => void;
  invalid?: boolean;
}> = ({ date, onChange, invalid }) => {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              aria-invalid={invalid}
              aria-label={t('change_date_or_time')}
              className="h-9 flex-1 justify-start font-normal"
            />
          }
        >
          <CalendarIcon className="text-muted-foreground" />
          {toPickerDate(date).toLocaleDateString('de-DE', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={de}
            weekStartsOn={1}
            selected={toPickerDate(date)}
            defaultMonth={toPickerDate(date)}
            onSelect={(day) => {
              if (!day) {
                return;
              }
              onChange(
                newDayjs(
                  dayjs(day).format('YYYY-MM-DD') + ' ' + date.format('HH:mm:ss')
                )
              );
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      <Input
        type="time"
        aria-label={t('editor_time')}
        aria-invalid={invalid}
        className="h-9 w-28 tabular-nums"
        value={date.format('HH:mm')}
        onChange={(e) => {
          if (!/^\d{2}:\d{2}$/.test(e.target.value)) {
            return;
          }
          onChange(
            newDayjs(date.format('YYYY-MM-DD') + ' ' + e.target.value + ':00')
          );
        }}
      />
    </div>
  );
};
