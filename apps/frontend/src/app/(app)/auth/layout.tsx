import { ReactNode } from 'react';
import loadDynamic from 'next/dynamic';
import { Toaster } from '@vibeschedule/react/toaster/toaster';
import { Logo, Wordmark } from '@vibeschedule/frontend/components/new-layout/logo';

const ReturnUrlComponent = loadDynamic(() => import('./return.url.component'));

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Toaster />
      <ReturnUrlComponent />
      <div className="min-h-screen w-screen flex items-center justify-center p-[16px] bg-newBgColor text-newTextColor">
        <div className="w-full max-w-[420px] flex flex-col gap-[28px] bg-newBgColorInner border border-newBorder rounded-[20px] p-[32px]">
          <div className="flex items-center gap-[12px]">
            <Logo size={40} />
            <Wordmark className="text-[24px]" />
          </div>
          {children}
        </div>
      </div>
    </>
  );
}
