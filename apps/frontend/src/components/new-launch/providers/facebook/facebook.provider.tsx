'use client';

import { withProvider } from '@vibeschedule/frontend/components/new-launch/providers/high.order.provider';
import { Select } from '@vibeschedule/react/form/select';
import { useSettings } from '@vibeschedule/frontend/components/launches/helpers/use.values';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { FacebookPreview } from '@vibeschedule/frontend/components/new-launch/providers/facebook/facebook.preview';

const FacebookSettings = () => {
  const t = useT();
  const { register } = useSettings();

  return (
    <Select
      label={t('placement')}
      {...register('placement', {
        value: 'timeline',
      })}
    >
      <option value="timeline">{t('placement_timeline')}</option>
      <option value="reels">{t('placement_reels')}</option>
      <option value="stories">{t('placement_stories')}</option>
    </Select>
  );
};

export default withProvider({
  SettingsComponent: FacebookSettings,
  CustomPreviewComponent: FacebookPreview,
  maximumCharacters: 63206,
});
