import { Metadata } from 'next';
import { PlatformAnalytics } from '@vibeschedule/frontend/components/platform-analytics/platform.analytics';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Analytics | vibeschedule',
};

export default function Page() {
  return <PlatformAnalytics />;
}
