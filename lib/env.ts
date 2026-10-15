/** A setting the site cannot work without: missing, the server refuses to start
 *  rather than fail on someone's first visit or sign-in, naming what is unset. */
export function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set`)
  return value
}
