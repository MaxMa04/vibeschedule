'use client';

import { withProvider } from '@vibeschedule/frontend/components/new-launch/providers/high.order.provider';
import { FieldGroup } from '@vibeschedule/frontend/components/ui/field';
import {
  SettingsSelect,
  SettingsSwitch,
} from '@vibeschedule/frontend/components/new-launch/providers/settings.fields';
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

  return (
    <FieldGroup>
      <SettingsSelect
        name="privacy_status"
        label={t('privacy_status')}
        defaultValue="public"
        options={privacyStatuses}
      />
      {toggles.map((item) => (
        <SettingsSwitch
          key={item.name}
          name={item.name}
          label={t(item.label)}
          defaultValue={item.value}
        />
      ))}
    </FieldGroup>
  );
};

export default withProvider({
  SettingsComponent: TikTokSettings,
  CustomPreviewComponent: TiktokPreview,
  maximumCharacters: 2200,
});
