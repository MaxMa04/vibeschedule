import '../globals.css';
import { ReactNode } from 'react';
import { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import LayoutContext from '@vibeschedule/frontend/components/layout/layout.context';
import { VariableContextComponent } from '@vibeschedule/react/helpers/variable.context';
import { geist, geistMono } from '@vibeschedule/frontend/fonts/fonts';
import { cn } from '@vibeschedule/frontend/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'vibeschedule',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: '/favicon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function AppLayout({ children }: { children: ReactNode }) {
  const mode =
    (await cookies()).get('mode')?.value === 'dark' ? 'dark' : 'light';
  return (
    <html
      lang="de"
      className={cn(
        'font-sans antialiased',
        geist.variable,
        geistMono.variable,
        mode
      )}
    >
      <body>
        <VariableContextComponent
          backendUrl={process.env.NEXT_PUBLIC_BACKEND_URL!}
          isSecured={!process.env.NOT_SECURED}
        >
          <LayoutContext>{children}</LayoutContext>
        </VariableContextComponent>
      </body>
    </html>
  );
}
