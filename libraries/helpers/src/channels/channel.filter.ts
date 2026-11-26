/** `app` filter value for channels that belong to no app */
export const NO_APP = 'none';

/** `user` filter value for the channels of the signed-in user */
export const ME = 'me';

export type TeamRole = 'ADMIN' | 'USER' | 'CLIPPER';

/** A team member, also as one of the people responsible for a channel */
export interface TeamUser {
  id: string;
  name: string | null;
  email: string;
  role: TeamRole;
}
