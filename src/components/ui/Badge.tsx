import clsx from 'clsx';
import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  color?: 'red' | 'green' | 'yellow' | 'blue' | 'gray' | 'orange';
  className?: string;
}

export function Badge({ children, color = 'gray', className }: BadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      {
        'bg-red-100 text-red-700': color === 'red',
        'bg-green-100 text-green-700': color === 'green',
        'bg-yellow-100 text-yellow-700': color === 'yellow',
        'bg-blue-100 text-blue-700': color === 'blue',
        'bg-gray-100 text-gray-700': color === 'gray',
        'bg-orange-100 text-orange-700': color === 'orange',
      },
      className
    )}>
      {children}
    </span>
  );
}
