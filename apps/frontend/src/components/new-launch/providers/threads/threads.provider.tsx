'use client';

import { withProvider } from '@vibeschedule/frontend/components/new-launch/providers/high.order.provider';
import { SettingsSelect } from '@vibeschedule/frontend/components/new-launch/providers/settings.fields';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';

const ThreadsSettings = () => {
  const t = useT();

  return (
    <SettingsSelect
      name="placement"
      label={t('placement')}
      defaultValue="timeline"
      options={[
        { value: 'timeline', label: 'placement_timeline' },
        { value: 'reels', label: 'placement_reels' },
      ]}
    />
  );
};

export default withProvider({
  SettingsComponent: ThreadsSettings,
  maximumCharacters: 500,
});
