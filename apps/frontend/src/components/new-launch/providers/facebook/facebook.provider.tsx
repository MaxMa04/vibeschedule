'use client';

import { withProvider } from '@vibeschedule/frontend/components/new-launch/providers/high.order.provider';
import { SettingsSelect } from '@vibeschedule/frontend/components/new-launch/providers/settings.fields';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { FacebookPreview } from '@vibeschedule/frontend/components/new-launch/providers/facebook/facebook.preview';

const FacebookSettings = () => {
  const t = useT();

  return (
    <SettingsSelect
      name="placement"
      label={t('placement')}
      defaultValue="timeline"
      options={[
        { value: 'timeline', label: 'placement_timeline' },
        { value: 'reels', label: 'placement_reels' },
        { value: 'stories', label: 'placement_stories' },
      ]}
    />
  );
};

export default withProvider({
  SettingsComponent: FacebookSettings,
  CustomPreviewComponent: FacebookPreview,
  maximumCharacters: 63206,
});
