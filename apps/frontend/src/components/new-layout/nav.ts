import {
  CalendarDaysIcon,
  ChartLineIcon,
  ImageIcon,
  LayersIcon,
  SettingsIcon,
  SquarePenIcon,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  path: string;
  /** translation key */
  label: string;
  icon: LucideIcon;
}

export const mainNav: NavItem[] = [
  { path: '/post', label: 'compose', icon: SquarePenIcon },
  { path: '/launches', label: 'calendar', icon: CalendarDaysIcon },
  { path: '/formats', label: 'formats', icon: LayersIcon },
  { path: '/analytics', label: 'analytics', icon: ChartLineIcon },
  { path: '/media', label: 'media', icon: ImageIcon },
];

export const secondaryNav: NavItem[] = [
  { path: '/settings', label: 'settings', icon: SettingsIcon },
];

export const navItemFor = (pathname: string) =>
  [...mainNav, ...secondaryNav].find((item) => pathname.startsWith(item.path));
