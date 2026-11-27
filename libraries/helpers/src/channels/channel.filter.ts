/** `app` filter value for channels that belong to no app */
export const NO_APP = 'none';

/** `user` filter value for the channels of the signed-in user */
export const ME = 'me';

/**
 * `clippers` filter value that leaves out every channel a clipper is
 * responsible for. Without it a `user` filter also covers the channels of
 * the clippers that user looks after (`UserOrganization.managerId`).
 */
export const NO_CLIPPERS = 'no';

export type TeamRole = 'ADMIN' | 'USER' | 'CLIPPER';

/** A team member, also as one of the people responsible for a channel */
export interface TeamUser {
  id: string;
  name: string | null;
  email: string;
  role: TeamRole;
  /** for a clipper: the team member who looks after them */
  managerId?: string | null;
}
