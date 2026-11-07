import { Metadata } from 'next';
import { Login } from '@vibeschedule/frontend/components/auth/login';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Anmelden | vibeschedule',
};

export default function Page() {
  return <Login />;
}
