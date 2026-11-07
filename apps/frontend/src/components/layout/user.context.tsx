'use client';

import { createContext, FC, ReactNode, useContext } from 'react';

export interface SelfUser {
  id: string;
  email: string;
  name: string | null;
  orgId: string;
  role: 'USER' | 'ADMIN';
  isAdmin: boolean;
  timezoneName?: string | null;
  // the org API key, only filled for admins
  publicApi?: string;
  apiKey?: string;
}

export const UserContext = createContext<SelfUser | undefined>(undefined);

export const ContextWrapper: FC<{
  user: SelfUser;
  children: ReactNode;
}> = ({ user, children }) => {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
