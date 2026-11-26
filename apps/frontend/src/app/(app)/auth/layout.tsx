import { ReactNode } from 'react';
import loadDynamic from 'next/dynamic';
import { Toaster } from '@vibeschedule/react/toaster/toaster';

const ReturnUrlComponent = loadDynamic(() => import('./return.url.component'));

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Toaster />
      <ReturnUrlComponent />
      <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-muted/40 p-4">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="flex items-center justify-center gap-2.5">
            <img
              src="/brand/mark-light.png"
              alt=""
              width={36}
              height={36}
              className="size-9 rounded-lg dark:hidden"
            />
            <img
              src="/brand/mark-dark.png"
              alt=""
              width={36}
              height={36}
              className="hidden size-9 rounded-lg dark:block"
            />
            <span className="font-heading text-xl font-semibold tracking-tight">
              vibeschedule
            </span>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}
