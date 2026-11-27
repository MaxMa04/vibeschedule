import {
  CalendarDaysIcon,
  ChartLineIcon,
  ImageIcon,
  LayersIcon,
  LightbulbIcon,
  ListChecksIcon,
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
  /** only for clippers */
  clipper?: boolean;
}

export const mainNav: NavItem[] = [
  { path: '/start', label: 'start_nav', icon: ListChecksIcon, clipper: true },
  { path: '/manual', label: 'manual_posting', icon: SmartphoneIcon },
  { path: '/launches', label: 'calendar', icon: CalendarDaysIcon },
  { path: '/formats', label: 'formats', icon: LayersIcon },
  { path: '/inspiration', label: 'inspiration', icon: LightbulbIcon },
  { path: '/analytics', label: 'analytics', icon: ChartLineIcon },
  { path: '/media', label: 'media', icon: ImageIcon },
  { path: '/clippers', label: 'clippers', icon: WalletIcon, admin: true },
];

export const secondaryNav: NavItem[] = [
  { path: '/settings', label: 'settings', icon: SettingsIcon },
];

// a clipper sets up the accounts and posts by hand, calendar, media and
// analytics are for the team
export const CLIPPER_PATHS = ['/start', '/manual', '/settings'];

export const navFor = (role?: string) =>
  role === 'CLIPPER'
    ? mainNav.filter((item) => CLIPPER_PATHS.includes(item.path))
    : mainNav.filter(
        (item) => !item.clipper && (!item.admin || role === 'ADMIN')
      );

export const navItemFor = (pathname: string) =>
  [...mainNav, ...secondaryNav].find((item) => pathname.startsWith(item.path));
