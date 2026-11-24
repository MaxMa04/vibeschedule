import { Metadata } from 'next';
import { Connected } from '@vibeschedule/frontend/components/auth/connected';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Konto verbunden | vibeschedule',
};

export default function Page() {
  return <Connected />;
}
