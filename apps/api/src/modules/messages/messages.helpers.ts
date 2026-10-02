/** Stores a user pair in deterministic order so a private conversation is unique. */
export function canonicalParticipants(firstUserId: string, secondUserId: string): [string, string] {
  return firstUserId.localeCompare(secondUserId) < 0
    ? [firstUserId, secondUserId]
    : [secondUserId, firstUserId];
}
