'use client';

import { ArrayNotEmpty, IsOptional, IsUrl, MaxLength } from 'class-validator';
import { withProvider } from '@vibeschedule/frontend/components/new-launch/providers/high.order.provider';
import { Input } from '@vibeschedule/react/form/input';
import { useSettings } from '@vibeschedule/frontend/components/launches/helpers/use.values';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { PinterestPreview } from '@vibeschedule/frontend/components/new-launch/providers/pinterest/pinterest.preview';

class PinterestSettingsDto {
  @ArrayNotEmpty({ message: 'pinterest_board_ids_required' })
  board_ids: string[];

  @IsOptional()
  @MaxLength(100, { message: 'pinterest_title_too_long' })
  title?: string;

  @IsOptional()
  @IsUrl({}, { message: 'pinterest_link_invalid' })
  link?: string;
}

const toList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const emptyToUndefined = (value: string) => value.trim() || undefined;

const PinterestSettings = () => {
  const t = useT();
  const {
    register,
    formState: { errors },
  } = useSettings();

  return (
    <div className="flex flex-col">
      <Input
        label={t('pinterest_board_ids')}
        error={errors.board_ids && t(errors.board_ids.message as string)}
        {...register('board_ids', {
          setValueAs: toList,
        })}
      />
      <div className="-mt-[6px] mb-[12px] text-[12px] text-textItemBlur">
        {t('pinterest_board_ids_hint')}
      </div>
      <Input
        label={t('title')}
        maxLength={100}
        error={errors.title && t(errors.title.message as string)}
        {...register('title', {
          setValueAs: emptyToUndefined,
        })}
      />
      <Input
        label={t('link')}
        error={errors.link && t(errors.link.message as string)}
        {...register('link', {
          setValueAs: emptyToUndefined,
        })}
      />
    </div>
  );
};

export default withProvider({
  SettingsComponent: PinterestSettings,
  CustomPreviewComponent: PinterestPreview,
  dto: PinterestSettingsDto,
  maximumCharacters: 500,
});
