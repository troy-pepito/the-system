/**
 * Maps a dungeon ID (kebab-case in the data layer) to the message-key
 * fragment used in messages/<locale>.json. JSON keys can't carry
 * hyphens cleanly inside dot-paths, so we store them snake-cased.
 */
export function dungeonKey(id: string): string {
  return id.replace(/-/g, "_");
}
