import { Metadata } from 'next';
import { MediaLibraryPage } from '@vibeschedule/frontend/components/media/media.component';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Medien | vibeschedule',
};

export default function Page() {
  return <MediaLibraryPage />;
}
