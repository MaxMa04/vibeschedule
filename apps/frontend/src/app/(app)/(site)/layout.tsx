import { cookies } from 'next/headers';
import { LayoutComponent } from '@vibeschedule/frontend/components/new-layout/layout.component';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebarOpen = (await cookies()).get('sidebar_state')?.value !== 'false';
  return <LayoutComponent sidebarOpen={sidebarOpen}>{children}</LayoutComponent>;
}
