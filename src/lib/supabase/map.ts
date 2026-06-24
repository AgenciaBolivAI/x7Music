/**
 * Map Postgres rows (snake_case, `id`) → the camelCase / `_id` JSON shape the
 * client API modules + pages already expect, so the migration stays in the API
 * layer (no page churn). Recursive: handles joined sub-objects and jsonb arrays
 * (writers[], line_items[]); leaves scalars and string arrays untouched.
 *
 * Special cases: `id` → `_id`, `sort_order` → `order`.
 */
const SPECIAL: Record<string, string> = { id: '_id', sort_order: 'order' };

function camelKey(k: string): string {
  if (SPECIAL[k]) return SPECIAL[k];
  return k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toCamel<T = any>(value: any): T {
  if (Array.isArray(value)) return value.map((v) => toCamel(v)) as unknown as T;
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out: any = {};
    for (const [k, v] of Object.entries(value)) out[camelKey(k)] = toCamel(v);
    return out as T;
  }
  return value as T;
}
