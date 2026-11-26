import type { AccountPlan } from '@vibeschedule/helpers/clippers/clipper.onboarding';
import type { ClipperTaskKind } from '@vibeschedule/helpers/clippers/clipper.tasks';

// something the clipper still has to do on one account
export interface ClipperTask {
  id: string;
  kind: ClipperTaskKind;
  title: string;
  description: string | null;
  /** Berlin day it was checked off, null while open */
  doneDay: string | null;
  createdAt: string;
}

// what /onboarding and /clippers/onboarding return for one account
export interface OnboardingAccount {
  id: string;
  position: number;
  profile: {
    name: string | null;
    username: string | null;
    bio: string | null;
    avatar: string | null;
    topic: string | null;
    searchTerms: string[];
    ready: boolean;
  };
  createdDay: string | null;
  plan: AccountPlan;
  tasks: ClipperTask[];
  openTasks: number;
  channel: {
    id: string;
    name: string;
    username: string | null;
    picture: string | null;
    disabled: boolean;
  } | null;
  usernameMismatch: boolean;
  /** connected before the onboarding, still to be switched to our profile */
  rebrand: boolean;
}

export interface OnboardingState {
  today: string;
  payout: { done: boolean; name: string | null; iban: string | null };
  accounts: OnboardingAccount[];
  done: boolean;
}

export interface ClipperApplication {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  name: string;
  email: string;
  phone: string;
  age: number;
  device: 'iphone' | 'android';
  accounts: number;
  experience: string | null;
  source: string | null;
  userId: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface OnboardingClipper {
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
  maxAccounts: number;
  since: string;
  payout: { name: string | null; iban: string | null };
  accounts: OnboardingAccount[];
  done: boolean;
}
