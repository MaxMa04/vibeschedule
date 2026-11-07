'use client';

import { withProvider } from '@vibeschedule/frontend/components/new-launch/providers/high.order.provider';
import { Select } from '@vibeschedule/react/form/select';
import { Input } from '@vibeschedule/react/form/input';
import { Checkbox } from '@vibeschedule/react/form/checkbox';
import { useSettings } from '@vibeschedule/frontend/components/launches/helpers/use.values';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { InstagramPreview } from '@vibeschedule/frontend/components/new-launch/providers/instagram/instagram.preview';

const toList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const InstagramSettings = () => {
  const t = useT();
  const { register, watch } = useSettings();
  const placement = watch('placement');

  return (
    <div className="flex flex-col">
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
      <Input
        label={t('instagram_collaborators')}
        {...register('collaborators', {
          setValueAs: toList,
        })}
      />
      {placement === 'reels' && (
        <Checkbox
          label={t('instagram_share_to_feed')}
          {...register('share_to_feed', {
            value: true,
          })}
        />
      )}
    </div>
  );
};

export default withProvider({
  SettingsComponent: InstagramSettings,
  CustomPreviewComponent: InstagramPreview,
  maximumCharacters: 2200,
});
