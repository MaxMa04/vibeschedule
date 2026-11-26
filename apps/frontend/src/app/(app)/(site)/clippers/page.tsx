import { Suspense } from 'react';
import { Metadata } from 'next';
import { ClippersPage } from '@vibeschedule/frontend/components/clippers/clippers.page';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Clipper | vibeschedule',
};

export default function Page() {
  return (
    <Suspense>
      <ClippersPage />
    </Suspense>
  );
}
