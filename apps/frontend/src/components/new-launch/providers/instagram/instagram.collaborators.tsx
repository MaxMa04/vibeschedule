'use client';

import { useWatch } from 'react-hook-form';
import { withProvider } from '@vibeschedule/frontend/components/new-launch/providers/high.order.provider';
import { FieldGroup } from '@vibeschedule/frontend/components/ui/field';
import {
  SettingsListInput,
  SettingsSelect,
  SettingsSwitch,
} from '@vibeschedule/frontend/components/new-launch/providers/settings.fields';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { InstagramPreview } from '@vibeschedule/frontend/components/new-launch/providers/instagram/instagram.preview';

const InstagramSettings = () => {
  const t = useT();
  const placement = useWatch({ name: 'placement' });

  return (
    <FieldGroup>
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
      <SettingsListInput
        name="collaborators"
        label={t('instagram_collaborators')}
      />
      {placement === 'reels' && (
        <SettingsSwitch
          name="share_to_feed"
          label={t('instagram_share_to_feed')}
          defaultValue={true}
        />
      )}
    </FieldGroup>
  );
};

export default withProvider({
  SettingsComponent: InstagramSettings,
  CustomPreviewComponent: InstagramPreview,
  maximumCharacters: 2200,
});
