import { Suspense } from 'react';
import { Metadata } from 'next';
import { ManualPosting } from '@vibeschedule/frontend/components/manual/manual.posting';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Manuell posten | vibeschedule',
};

export default function Page() {
  return (
    <Suspense>
      <ManualPosting />
    </Suspense>
  );
}
