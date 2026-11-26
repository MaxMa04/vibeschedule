import { Metadata } from 'next';
import { ClippingApply } from '@vibeschedule/frontend/components/clipping/clipping.apply';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'TikTok Clipping | VibeLabs',
  description:
    'Poste fertige TikTok-Posts für unsere Apps auf deinen Accounts und verdien jeden Monat Geld. Jetzt bewerben.',
};

export default function Page() {
  return <ClippingApply />;
}
