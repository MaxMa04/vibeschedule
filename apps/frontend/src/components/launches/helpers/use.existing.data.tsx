import { createContext, FC, ReactNode, useContext } from 'react';
import { Post } from '@prisma/client';
import { Media } from '@vibeschedule/frontend/components/new-launch/store';

// GET /posts/group/:group returns the media already parsed
export type ExistingPost = Omit<Post, 'image'> & { image: Media[] };

const ExistingDataContext = createContext({
  integration: '',
  group: undefined as undefined | string,
  posts: [] as ExistingPost[],
  settings: {} as any,
  // the other channels the post was created with
  siblings: undefined as
    | undefined
    | {
        integration: string;
        group: string;
        posts: ExistingPost[];
        settings: any;
      }[],
});
export const ExistingDataContextProvider: FC<{
  children: ReactNode;
  value: any;
}> = ({ children, value }) => {
  return (
    <ExistingDataContext.Provider value={value}>
      {children}
    </ExistingDataContext.Provider>
  );
};
export const useExistingData = () => useContext(ExistingDataContext);
