/** Fail-fast secret loader: no defaults, no silent insecure boot. */
export function getSecret(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
