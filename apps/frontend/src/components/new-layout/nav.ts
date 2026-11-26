import {
  CalendarDaysIcon,
  ChartLineIcon,
  ImageIcon,
  LayersIcon,
  SettingsIcon,
  SmartphoneIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  path: string;
  /** translation key */
  label: string;
  icon: LucideIcon;
  /** only for admins */
  admin?: boolean;
}

export const mainNav: NavItem[] = [
  { path: '/manual', label: 'manual_posting', icon: SmartphoneIcon },
  { path: '/launches', label: 'calendar', icon: CalendarDaysIcon },
  { path: '/formats', label: 'formats', icon: LayersIcon },
  { path: '/analytics', label: 'analytics', icon: ChartLineIcon },
  { path: '/media', label: 'media', icon: ImageIcon },
  { path: '/clippers', label: 'clippers', icon: WalletIcon, admin: true },
];

export const secondaryNav: NavItem[] = [
  { path: '/settings', label: 'settings', icon: SettingsIcon },
];

// a clipper only posts by hand, calendar, media and analytics are for the team
export const navFor = (role?: string) =>
  role === 'CLIPPER'
    ? mainNav.filter((item) => item.path === '/manual')
    : mainNav.filter((item) => !item.admin || role === 'ADMIN');

export const navItemFor = (pathname: string) =>
  [...mainNav, ...secondaryNav].find((item) => pathname.startsWith(item.path));
