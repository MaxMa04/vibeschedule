import { Metadata } from 'next';
import { PostForMeReturn } from '@vibeschedule/frontend/components/launches/postforme.return';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Kanal verbinden | vibeschedule',
};

export default function Page() {
  return <PostForMeReturn />;
}
