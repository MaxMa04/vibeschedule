'use client';

import { ArrayNotEmpty, IsOptional, IsUrl, MaxLength } from 'class-validator';
import { withProvider } from '@vibeschedule/frontend/components/new-launch/providers/high.order.provider';
import { FieldGroup } from '@vibeschedule/frontend/components/ui/field';
import {
  SettingsInput,
  SettingsListInput,
} from '@vibeschedule/frontend/components/new-launch/providers/settings.fields';
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

const PinterestSettings = () => {
  const t = useT();

  return (
    <FieldGroup>
      <SettingsListInput
        name="board_ids"
        label={t('pinterest_board_ids')}
        description={t('pinterest_board_ids_hint')}
      />
      <SettingsInput name="title" label={t('title')} maxLength={100} />
      <SettingsInput name="link" label={t('link')} />
    </FieldGroup>
  );
};

export default withProvider({
  SettingsComponent: PinterestSettings,
  CustomPreviewComponent: PinterestPreview,
  dto: PinterestSettingsDto,
  maximumCharacters: 500,
});
