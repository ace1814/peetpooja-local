import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export function TopBar({ title }: { title?: string }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 no-print">
      <h1 className="text-base font-semibold font-display text-gray-800">{title ?? 'PeetPooja'}</h1>
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span>{format(time, 'dd MMM yyyy')}</span>
        <span className="font-mono font-medium text-gray-700">{format(time, 'HH:mm:ss')}</span>
      </div>
    </header>
  );
}
