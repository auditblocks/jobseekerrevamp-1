/**
 * @file accountAccess.ts
 * Evaluates whether a user profile is banned or suspended and returns
 * a human-readable denial message for the auth gate in `useAuth`.
 */

/** Minimal profile fields required to evaluate access. */
export type ProfileAccessFields = {
  status: string | null | undefined;
  suspended_until?: string | null;
};

/**
 * Returns a user-facing denial message if the account is banned or still suspended.
 * Returns `null` when the account is in good standing and access should be allowed.
 * @param profile - Profile row (or null if not yet loaded).
 */
export function getAccountAccessDenialMessage(profile: ProfileAccessFields | null | undefined): string | null {
  if (!profile) return null;
  if (profile.status === "banned") {
    return "Your account has been banned. If you think this is a mistake, contact support.";
  }
  if (profile.status === "suspended") {
    const until = profile.suspended_until ? new Date(profile.suspended_until) : null;
    if (!until || until.getTime() > Date.now()) {
      if (until && until.getTime() > Date.now()) {
        const days = Math.max(1, Math.ceil((until.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
        return `Your account is suspended. You can sign in again in about ${days} day(s).`;
      }
      return "Your account is suspended. Please try again later or contact support.";
    }
  }
  return null;
}
