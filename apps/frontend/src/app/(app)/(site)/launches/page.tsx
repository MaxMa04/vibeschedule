import { Metadata } from 'next';
import { LaunchesComponent } from '@vibeschedule/frontend/components/launches/launches.component';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Kalender | vibeschedule',
};

export default function Page() {
  return <LaunchesComponent />;
}
