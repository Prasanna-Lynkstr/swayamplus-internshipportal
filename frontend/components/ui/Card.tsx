import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  pastel,
  id,
}: {
  children: ReactNode;
  className?: string;
  pastel?: 'yellow' | 'peach' | 'lavender' | 'mint';
  id?: string;
}) {
  const pastelClass = pastel
    ? {
        yellow: 'bg-sp-pastel-yellow',
        peach: 'bg-sp-pastel-peach',
        lavender: 'bg-sp-pastel-lavender',
        mint: 'bg-sp-pastel-mint',
      }[pastel]
    : 'bg-sp-bg-elev';

  return (
    <div
      id={id}
      className={`rounded-sp-xl ${pastelClass} border border-black/5 shadow-sm shadow-black/5 ${className}`}
    >
      {children}
    </div>
  );
}
