'use client';

import { IsNotEmpty, MaxLength } from 'class-validator';
import { withProvider } from '@vibeschedule/frontend/components/new-launch/providers/high.order.provider';
import { Input } from '@vibeschedule/react/form/input';
import { Select } from '@vibeschedule/react/form/select';
import { Checkbox } from '@vibeschedule/react/form/checkbox';
import { useSettings } from '@vibeschedule/frontend/components/launches/helpers/use.values';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { YoutubePreview } from '@vibeschedule/frontend/components/new-launch/providers/youtube/youtube.preview';

class YoutubeSettingsDto {
  @IsNotEmpty({ message: 'youtube_title_required' })
  @MaxLength(100, { message: 'youtube_title_too_long' })
  title: string;
}

const privacyStatuses = [
  { value: 'public', label: 'privacy_public' },
  { value: 'private', label: 'privacy_private' },
  { value: 'unlisted', label: 'privacy_unlisted' },
];

const toList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const YoutubeSettings = () => {
  const t = useT();
  const {
    register,
    formState: { errors },
  } = useSettings();

  return (
    <div className="flex flex-col">
      <Input
        label={t('title')}
        maxLength={100}
        error={errors.title && t(errors.title.message as string)}
        {...register('title')}
      />
      <Select
        label={t('privacy_status')}
        {...register('privacy_status', {
          value: 'public',
        })}
      >
        {privacyStatuses.map((item) => (
          <option key={item.value} value={item.value}>
            {t(item.label)}
          </option>
        ))}
      </Select>
      <Input
        label={t('tags_comma_separated')}
        {...register('tags', {
          setValueAs: toList,
        })}
      />
      <Checkbox
        label={t('youtube_made_for_kids')}
        {...register('made_for_kids', {
          value: false,
        })}
      />
    </div>
  );
};

export default withProvider({
  SettingsComponent: YoutubeSettings,
  CustomPreviewComponent: YoutubePreview,
  dto: YoutubeSettingsDto,
  maximumCharacters: 5000,
});
