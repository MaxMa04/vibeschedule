'use client';

import { withProvider } from '@vibeschedule/frontend/components/new-launch/providers/high.order.provider';
import { LinkedinPreview } from '@vibeschedule/frontend/components/new-launch/providers/linkedin/linkedin.preview';

export default withProvider({
  SettingsComponent: null,
  CustomPreviewComponent: LinkedinPreview,
  maximumCharacters: 3000,
});
