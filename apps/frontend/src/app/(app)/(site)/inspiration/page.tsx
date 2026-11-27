import { Suspense } from 'react';
import { Metadata } from 'next';
import { InspirationPage } from '@vibeschedule/frontend/components/inspiration/inspiration.page';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Inspiration | vibeschedule',
};

export default function Page() {
  return (
    <Suspense>
      <InspirationPage />
    </Suspense>
  );
}
