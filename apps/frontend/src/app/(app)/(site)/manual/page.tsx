import { Metadata } from 'next';
import { ManualPosting } from '@vibeschedule/frontend/components/manual/manual.posting';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Posten | vibeschedule',
};

export default function Page() {
  return <ManualPosting />;
}
