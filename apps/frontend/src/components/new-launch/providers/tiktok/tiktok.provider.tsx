'use client';

import { withProvider } from '@vibeschedule/frontend/components/new-launch/providers/high.order.provider';
import { Select } from '@vibeschedule/react/form/select';
import { Checkbox } from '@vibeschedule/react/form/checkbox';
import { useSettings } from '@vibeschedule/frontend/components/launches/helpers/use.values';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { TiktokPreview } from '@vibeschedule/frontend/components/new-launch/providers/tiktok/tiktok.preview';

const privacyStatuses = [
  { value: 'public', label: 'privacy_public' },
  { value: 'private', label: 'privacy_private' },
  { value: 'followers', label: 'privacy_followers' },
  { value: 'friends', label: 'privacy_friends' },
];

const toggles = [
  { name: 'allow_comment', label: 'label_comments', value: true },
  { name: 'allow_duet', label: 'label_duet', value: true },
  { name: 'allow_stitch', label: 'label_stitch', value: true },
  {
    name: 'disclose_your_brand',
    label: 'tiktok_disclose_your_brand',
    value: false,
  },
  {
    name: 'disclose_branded_content',
    label: 'tiktok_disclose_branded_content',
    value: false,
  },
  { name: 'is_ai_generated', label: 'is_ai_generated', value: false },
  { name: 'is_draft', label: 'tiktok_is_draft', value: false },
  { name: 'auto_add_music', label: 'tiktok_auto_add_music', value: false },
];

const TikTokSettings = () => {
  const t = useT();
  const { register } = useSettings();

  return (
    <div className="flex flex-col">
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
      <div className="flex flex-col gap-[16px]">
        {toggles.map((item) => (
          <Checkbox
            key={item.name}
            label={t(item.label)}
            {...register(item.name, {
              value: item.value,
            })}
          />
        ))}
      </div>
    </div>
  );
};

export default withProvider({
  SettingsComponent: TikTokSettings,
  CustomPreviewComponent: TiktokPreview,
  maximumCharacters: 2200,
});
