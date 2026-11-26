import { Suspense } from 'react';
import { Metadata } from 'next';
import { ClipperStart } from '@vibeschedule/frontend/components/onboarding/clipper.start';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dein Start | vibeschedule',
};

export default function Page() {
  return (
    <Suspense>
      <ClipperStart />
    </Suspense>
  );
}
