import { ReactNode } from 'react';

export default function IntegrationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background p-4 text-foreground">
      {children}
    </div>
  );
}
