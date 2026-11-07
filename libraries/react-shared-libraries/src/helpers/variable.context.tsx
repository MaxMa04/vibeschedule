'use client';

import { createContext, FC, ReactNode, useContext } from 'react';

interface VariableContextInterface {
  backendUrl: string;
  isSecured: boolean;
}

const VariableContext = createContext<VariableContextInterface>({
  backendUrl: '',
  isSecured: false,
});

export const VariableContextComponent: FC<
  VariableContextInterface & {
    children: ReactNode;
  }
> = ({ children, ...variables }) => {
  return (
    <VariableContext.Provider value={variables}>
      {children}
    </VariableContext.Provider>
  );
};

export const useVariables = () => {
  return useContext(VariableContext);
};
