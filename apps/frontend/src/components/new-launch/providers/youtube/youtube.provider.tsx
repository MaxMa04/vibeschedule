'use client';

import { IsNotEmpty, MaxLength } from 'class-validator';
import { withProvider } from '@vibeschedule/frontend/components/new-launch/providers/high.order.provider';
import { FieldGroup } from '@vibeschedule/frontend/components/ui/field';
import {
  SettingsInput,
  SettingsListInput,
  SettingsSelect,
  SettingsSwitch,
} from '@vibeschedule/frontend/components/new-launch/providers/settings.fields';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { YoutubePreview } from '@vibeschedule/frontend/components/new-launch/providers/youtube/youtube.preview';

class YoutubeSettingsDto {
  @IsNotEmpty({ message: 'youtube_title_required' })
  @MaxLength(100, { message: 'youtube_title_too_long' })
  title: string;
}

const YoutubeSettings = () => {
  const t = useT();

  return (
    <FieldGroup>
      <SettingsInput name="title" label={t('title')} maxLength={100} />
      <SettingsSelect
        name="privacy_status"
        label={t('privacy_status')}
        defaultValue="public"
        options={[
          { value: 'public', label: 'privacy_public' },
          { value: 'private', label: 'privacy_private' },
          { value: 'unlisted', label: 'privacy_unlisted' },
        ]}
      />
      <SettingsListInput name="tags" label={t('tags_comma_separated')} />
      <SettingsSwitch
        name="made_for_kids"
        label={t('youtube_made_for_kids')}
        defaultValue={false}
      />
    </FieldGroup>
  );
};

export default withProvider({
  SettingsComponent: YoutubeSettings,
  CustomPreviewComponent: YoutubePreview,
  dto: YoutubeSettingsDto,
  maximumCharacters: 5000,
});
