import type { AccountPlan } from '@vibeschedule/helpers/clippers/clipper.onboarding';
import type { ClipperTaskKind } from '@vibeschedule/helpers/clippers/clipper.tasks';
import type {
  AccountToDo,
  ClipperToDo,
} from '@vibeschedule/helpers/clippers/clipper.todo';

// something to do on one account or about the clipper in general: for the
// clipper, or for us (forTeam, only in the admin views)
export interface ClipperTask {
  id: string;
  kind: ClipperTaskKind;
  title: string;
  description: string | null;
  forTeam: boolean;
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
  /** the next step, or the posts of the day once the account runs */
  todo: AccountToDo;
  /** the app the account runs for, with the brief the clipper reads */
  app: ClipperApp | null;
  tasks: ClipperTask[];
  /** open tasks for the clipper */
  openTasks: number;
  /** open tasks for us, 0 for clippers */
  teamTasks: number;
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

export interface ClipperApp {
  id: string;
  name: string;
  brief: string | null;
}

export interface OnboardingState {
  today: string;
  payout: { done: boolean; name: string | null; iban: string | null };
  /** who looks after the clipper */
  manager: { name: string } | null;
  /** the apps of the accounts, each once */
  apps: ClipperApp[];
  /** tasks about the clipper in general */
  tasks: ClipperTask[];
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

interface Person {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
}

export interface OnboardingClipper {
  user: Person;
  /** the team member who looks after the clipper */
  manager: Person | null;
  maxAccounts: number;
  since: string;
  payout: { name: string | null; iban: string | null };
  /** tasks about the clipper in general */
  tasks: ClipperTask[];
  openTasks: number;
  teamTasks: number;
  accounts: OnboardingAccount[];
  todo: ClipperToDo;
  done: boolean;
}
