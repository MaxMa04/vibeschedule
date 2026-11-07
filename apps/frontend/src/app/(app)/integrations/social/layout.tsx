import { ReactNode } from 'react';

export default function IntegrationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="bg-newBgColor text-newTextColor flex flex-1 items-center justify-center min-h-screen w-screen">
      {children}
    </div>
  );
}
