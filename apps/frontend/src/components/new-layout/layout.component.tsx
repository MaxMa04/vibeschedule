'use client';

import React, { ReactNode, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { Toaster } from '@vibeschedule/react/toaster/toaster';
import { ContextWrapper } from '@vibeschedule/frontend/components/layout/user.context';
import { ModalProvider } from '@vibeschedule/frontend/components/layout/new-modal';
import { setUserTimezone } from '@vibeschedule/frontend/components/layout/set.timezone';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@vibeschedule/frontend/components/ui/sidebar';
import { Separator } from '@vibeschedule/frontend/components/ui/separator';
import { TooltipProvider } from '@vibeschedule/frontend/components/ui/tooltip';
import { AppSidebar } from '@vibeschedule/frontend/components/new-layout/app-sidebar';
import { navItemFor } from '@vibeschedule/frontend/components/new-layout/nav';

const PageTitle = () => {
  const t = useT();
  const item = navItemFor(usePathname());
  return (
    <span className="truncate text-sm font-medium">
      {item ? t(item.label) : 'vibeschedule'}
    </span>
  );
};

export const LayoutComponent = ({
  children,
  sidebarOpen,
}: {
  children: ReactNode;
  sidebarOpen: boolean;
}) => {
  const fetch = useFetch();
  const load = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);
  const { data: user } = useSWR('/user/self', load, {
    // set before anything renders a date in the user's timezone
    onSuccess: (data) => setUserTimezone(data?.timezoneName),
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
  });

  if (!user) return null;

  return (
    <ContextWrapper user={user}>
      <ModalProvider>
        <TooltipProvider delay={300}>
          <Toaster />
          <SidebarProvider defaultOpen={sidebarOpen}>
            <AppSidebar />
            <SidebarInset className="min-w-0">
              <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-backdrop-filter:bg-background/80">
                <SidebarTrigger className="size-9 md:size-7" />
                <Separator
                  orientation="vertical"
                  className="mr-1 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
                />
                <PageTitle />
              </header>
              <div className="flex min-w-0 flex-1 flex-col">{children}</div>
            </SidebarInset>
          </SidebarProvider>
        </TooltipProvider>
      </ModalProvider>
    </ContextWrapper>
  );
};
