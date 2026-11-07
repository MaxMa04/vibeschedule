import { Metadata } from 'next';
import { MediaLayoutComponent } from '@vibeschedule/frontend/components/new-layout/layout.media.component';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Medien | vibeschedule',
};

export default function Page() {
  return <MediaLayoutComponent />;
}
