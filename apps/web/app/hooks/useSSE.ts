'use client';
import { useEffect, useState } from 'react';

export function useSSE<T=any>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    if (!url) return;
    const es = new EventSource(url);
    es.onmessage = (e) => {
      try { setData(JSON.parse(e.data)); } catch { /* noop */ }
    };
    return () => es.close();
  }, [url]);
  return data;
}
