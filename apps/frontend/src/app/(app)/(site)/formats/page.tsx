import { Suspense } from 'react';
import { Metadata } from 'next';
import { FormatsPage } from '@vibeschedule/frontend/components/formats/formats.page';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Formate | vibeschedule',
};

export default function Page() {
  return (
    <Suspense>
      <FormatsPage />
    </Suspense>
  );
}
