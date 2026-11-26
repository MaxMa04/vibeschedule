'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback } from 'react';
import {
  ChevronsUpDownIcon,
  LogOutIcon,
  MoonIcon,
  SunIcon,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@vibeschedule/frontend/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@vibeschedule/frontend/components/ui/dropdown-menu';
import {
  Avatar,
  AvatarFallback,
} from '@vibeschedule/frontend/components/ui/avatar';
import {
  mainNav,
  NavItem,
  secondaryNav,
} from '@vibeschedule/frontend/components/new-layout/nav';
import { useThemeMode } from '@vibeschedule/frontend/components/layout/mode.component';
import { setCookie } from '@vibeschedule/frontend/components/layout/layout.context';
import { useUser } from '@vibeschedule/frontend/components/layout/user.context';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useVariables } from '@vibeschedule/react/helpers/variable.context';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';

const NavLinks = ({ items }: { items: NavItem[] }) => {
  const pathname = usePathname();
  const t = useT();
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.path}>
          <SidebarMenuButton
            isActive={pathname.startsWith(item.path)}
            tooltip={t(item.label)}
            render={
              <Link
                href={item.path}
                prefetch
                onClick={() => isMobile && setOpenMobile(false)}
              />
            }
          >
            <item.icon />
            <span>{t(item.label)}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
};

const UserMenu = () => {
  const t = useT();
  const user = useUser();
  const fetch = useFetch();
  const { isSecured } = useVariables();
  const { isMobile } = useSidebar();
  const { mode, toggle } = useThemeMode();
  const name = user?.name || user?.email || '';

  const logout = useCallback(async () => {
    if (!isSecured) {
      setCookie('auth', '', -10);
    } else {
      await fetch('/user/logout', { method: 'POST' });
    }
    window.location.href = '/';
  }, [isSecured]);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg">
                {name.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{name}</span>
              {user?.name ? (
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              ) : null}
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={toggle}>
                {mode === 'dark' ? <SunIcon /> : <MoonIcon />}
                {mode === 'dark' ? t('light_mode') : t('dark_mode')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout}>
                <LogOutIcon />
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

export const AppSidebar = () => {
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={
                <Link
                  href="/launches"
                  onClick={() => isMobile && setOpenMobile(false)}
                />
              }
            >
              <img
                src="/brand/mark-light.png"
                alt=""
                className="size-8 shrink-0 rounded-lg dark:hidden"
              />
              <img
                src="/brand/mark-dark.png"
                alt=""
                className="hidden size-8 shrink-0 rounded-lg dark:block"
              />
              <span className="truncate font-semibold">vibeschedule</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <NavLinks items={mainNav} />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <NavLinks items={secondaryNav} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};
