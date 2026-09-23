/**
 * The page to open after signing in. Only paths of this application are accepted,
 * so a link cannot send the user to another site after signing in ("open redirect").
 */
export function safeReturnUrl(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
    ? value
    : '/activities';
}
