'use client';
import { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const set = () => setOnline(navigator.onLine);
    set();
    window.addEventListener('online', set);
    window.addEventListener('offline', set);
    return () => {
      window.removeEventListener('online', set);
      window.removeEventListener('offline', set);
    };
  }, []);
  if (online) return null;
  return (
    <div className="mb-4 p-3 flex items-center gap-2 rounded-xl bg-yellow-100 border border-yellow-300 text-yellow-800 text-sm">
      <span className="inline-block h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
      Offline mode active – showing last synced data. Changes will sync once reconnected.
    </div>
  );
}
