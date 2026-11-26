import { Suspense } from 'react';
import { Metadata } from 'next';
import { SettingsPage } from '@vibeschedule/frontend/components/settings/settings.page.component';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Einstellungen | vibeschedule',
};

export default function Page() {
  return (
    <Suspense>
      <SettingsPage />
    </Suspense>
  );
}
