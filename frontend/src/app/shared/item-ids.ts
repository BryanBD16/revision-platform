/**
 * A new id for an item of a module's content, such as a choice or a pair. It is random,
 * so it never reuses the id of a deleted item that saved answers may still refer to.
 */
export function newItemId(prefix: string, taken: ReadonlySet<string>): string {
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    const id = prefix + Array.from(bytes, (byte) => byte.toString(36).padStart(2, '0')).join('');
    if (!taken.has(id)) {
      return id;
    }
  }
}
