'use client';
import { useEffect } from 'react';

export default function RegisterSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js'.replace('.js','.ts')).catch(console.error);
    }
    const onOnline = () => document.dispatchEvent(new CustomEvent('online-resume'));
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);
  return null;
}
