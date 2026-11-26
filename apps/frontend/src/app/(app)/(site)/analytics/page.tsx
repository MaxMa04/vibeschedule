import { Suspense } from 'react';
import { Metadata } from 'next';
import { AnalyticsView } from '@vibeschedule/frontend/components/analytics/analytics-view';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Analytics | vibeschedule',
};

export default function Page() {
  return (
    <Suspense>
      <AnalyticsView />
    </Suspense>
  );
}
