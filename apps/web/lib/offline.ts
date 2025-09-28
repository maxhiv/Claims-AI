/**
 * Minimal offline queue using localStorage.
 * For production, replace with IndexedDB for robustness.
 */
type QueuedItem = { id: string; url: string; method: string; body?: any; ts: number };

const KEY = 'offlineQueue';

function load(): QueuedItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function save(items: QueuedItem[]) { localStorage.setItem(KEY, JSON.stringify(items)); }

export function enqueue(url: string, method: string, body?: any) {
  const items = load();
  items.push({ id: crypto.randomUUID(), url, method, body, ts: Date.now() });
  save(items);
}

export async function flush(): Promise<number> {
  const items = load();
  let sent = 0;
  const remaining: QueuedItem[] = [];
  for (const it of items) {
    try {
      const res = await fetch(it.url, {
        method: it.method,
        headers: { 'Content-Type': 'application/json' },
        body: it.body ? JSON.stringify(it.body) : undefined,
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      sent++;
    } catch (e) {
      remaining.push(it);
    }
  }
  save(remaining);
  return sent;
}
