/** Fields needed to decide if an authenticated user must be signed out. */
export type ProfileAccessFields = {
  status: string | null | undefined;
  suspended_until?: string | null;
};

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
