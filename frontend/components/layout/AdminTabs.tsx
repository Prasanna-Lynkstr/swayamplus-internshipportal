'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/admin/employers', label: 'Employers' },
  { href: '/admin/requests', label: 'Internship requests' },
];

export function AdminTabs() {
  const pathname = usePathname();
  return (
    <div className="flex gap-2 border-b border-black/5 pb-3">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
            pathname === tab.href
              ? 'bg-sp-navy text-white'
              : 'text-sp-ink-2 hover:bg-black/5'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
