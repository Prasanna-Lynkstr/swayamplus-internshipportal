import Link from 'next/link';
import { getServerAuthUser } from '@/lib/serverAuth';

// Mirrors the real swayamplus.education.gov.in footer's content and column
// structure for visual parity with the rest of the portal — this whole
// component is a placeholder standing in for the actual shared SWAYAM Plus
// footer, which will replace it once this module is integrated into the
// unified portal (see frontend/CLAUDE.md's "contained, swappable piece"
// guidance, same reasoning as the auth layer). Only items with a real
// destination inside this module are wired as links; the rest (course
// catalog, NCrF/UGC pages, support/legal pages) belong to parts of the
// SWAYAM Plus platform that don't exist in this standalone build, so they're
// rendered as plain, non-interactive labels rather than dead anchors.
export async function Footer() {
  const user = await getServerAuthUser();
  const isEmployer = user?.role === 'employer';

  const columns: Array<{
    title: string;
    items: Array<{ label: string; href?: string }>;
  }> = [
    {
      title: 'Explore',
      items: [
        { label: 'All Courses' },
        { label: 'Domains' },
        { label: 'Free Courses' },
        { label: 'For Institutions' },
        { label: 'NCrF Credit Transfer' },
        { label: 'UGC Alignment' },
        { label: 'For Colleges' },
        {
          label: isEmployer ? 'My internships' : 'For Employers',
          href: isEmployer ? '/employer/dashboard' : '/internships/employers',
        },
      ],
    },
    {
      title: 'Support',
      items: [{ label: 'Help Centre' }, { label: 'Accessibility' }, { label: 'Contact' }],
    },
    {
      title: 'Legal',
      items: [
        { label: 'Privacy Policy' },
        { label: 'Honor Code' },
        { label: 'Terms of Use' },
        { label: 'Refund Policy' },
        { label: 'RTI' },
      ],
    },
  ];

  return (
    <footer className="mt-16 bg-sp-navy">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-12 sm:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))]">
        <div className="flex flex-col gap-3">
          <span className="text-lg font-extrabold tracking-tight text-white">
            SWAYAM Plus<span className="text-sp-orange">+</span>
          </span>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-sp-bg-sunken px-3 py-1 text-xs font-bold text-sp-ink-2">
            🇮🇳 Made in Bharat
          </span>
          <p className="text-sm text-white/60">
            An initiative by the Ministry of Education, Government of India, implemented through the Indian
            Institute of Technology Madras.
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="mb-3 text-sm font-bold text-white">{col.title}</h4>
            <ul className="space-y-2">
              {col.items.map((item) =>
                item.href ? (
                  <li key={item.label}>
                    <Link href={item.href} className="text-sm text-white/75 hover:text-white">
                      {item.label}
                    </Link>
                  </li>
                ) : (
                  <li key={item.label} className="text-sm text-white/35">
                    {item.label}
                  </li>
                ),
              )}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-white/50 sm:flex-row">
          <span>
            © {new Date().getFullYear()} Ministry of Education, Government of India · All rights reserved.
            <span className="mx-2">·</span>
            Implemented by IIT Madras
          </span>
          <Link href="/admin/login" className="hover:text-white">
            Admin sign-in
          </Link>
        </div>
      </div>
    </footer>
  );
}
