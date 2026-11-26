// PfM keeps the external_id of the connect link on the social account. A
// clipper's link carries the clipper, so the channel lands with them after
// the sync: `<orgId>` for the team, `<orgId>:<userId>` for a clipper.
export const connectExternalId = (orgId: string, userId?: string) =>
  userId ? `${orgId}:${userId}` : orgId;

/** the user a connect link was made for, if it belongs to this workspace */
export const connectOwner = (orgId: string, externalId?: string | null) => {
  const prefix = `${orgId}:`;
  return externalId?.startsWith(prefix) && externalId.length > prefix.length
    ? externalId.slice(prefix.length)
    : null;
};
