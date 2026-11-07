import '../global.scss';
import 'react-tooltip/dist/react-tooltip.css';
import { ReactNode } from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import clsx from 'clsx';
import LayoutContext from '@vibeschedule/frontend/components/layout/layout.context';
import { VariableContextComponent } from '@vibeschedule/react/helpers/variable.context';
import { inter, spaceGrotesk } from '@vibeschedule/frontend/fonts/fonts';

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

export default async function AppLayout({ children }: { children: ReactNode }) {
  const mode =
    (await cookies()).get('mode')?.value === 'dark' ? 'dark' : 'light';
  return (
    <html lang="de">
      <body
        className={clsx(
          inter.variable,
          spaceGrotesk.variable,
          'font-sans text-primary !bg-primary',
          mode
        )}
      >
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
