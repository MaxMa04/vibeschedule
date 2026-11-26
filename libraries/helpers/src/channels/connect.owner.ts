// PfM keeps the external_id of the connect link on the social account. A
// clipper's link carries the clipper, so the channel lands with them after
// the sync: `<orgId>` for the team, `<orgId>:<userId>` for a clipper and
// `<orgId>:<userId>:<accountId>` for one of the clipper's onboarding accounts
// (ClipperAccount), which the channel then belongs to.
export const connectExternalId = (
  orgId: string,
  userId?: string,
  accountId?: string
) =>
  [orgId, ...(userId ? [userId, ...(accountId ? [accountId] : [])] : [])].join(
    ':'
  );

const parts = (orgId: string, externalId?: string | null) => {
  const prefix = `${orgId}:`;
  if (!externalId?.startsWith(prefix)) {
    return [];
  }
  return externalId.slice(prefix.length).split(':');
};

/** the user a connect link was made for, if it belongs to this workspace */
export const connectOwner = (orgId: string, externalId?: string | null) =>
  parts(orgId, externalId)[0] || null;

/** the onboarding account a connect link was made for */
export const connectAccount = (orgId: string, externalId?: string | null) => {
  const [userId, accountId] = parts(orgId, externalId);
  return userId && accountId ? accountId : null;
};
