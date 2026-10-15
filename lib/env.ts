/** Whether a user is one of e-ID's admins, who see every number a person's page
 *  has (the rest see totals until Premium decides what is whose, README): their
 *  ids in ADMIN_USER_IDS, comma-separated, set in the deployment and never in this
 *  public repository. Unset, there are none. */
export function isAdmin(userId: string): boolean {
  return (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .some((id) => id.trim() === userId)
}

/** A setting the site cannot work without: missing, the server refuses to start
 *  rather than fail on someone's first visit or sign-in, naming what is unset. */
export function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set`)
  return value
}
