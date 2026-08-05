import Link from 'next/link';

const COLUMNS = [
  {
    title: 'Explore',
    links: [
      { href: '/internships', label: 'Browse internships' },
      { href: '/register/student', label: 'Student registration' },
      { href: '/register/employer', label: 'Employer registration' },
    ],
  },
  {
    title: 'For Institutions',
    links: [
      { href: '/register/employer', label: 'Partner with us' },
      { href: '/admin/login', label: 'Admin sign-in' },
    ],
  },
  {
    title: 'Support',
    links: [
      { href: '/#faq', label: 'FAQ' },
      { href: '/#contact', label: 'Contact us' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/#terms', label: 'Terms of use' },
      { href: '/#privacy', label: 'Privacy policy' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-black/5 bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 sm:grid-cols-4">
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h4 className="mb-3 text-sm font-bold text-sp-navy">{col.title}</h4>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-sp-ink-2 hover:text-sp-blue">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-black/5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-sp-ink-3 sm:flex-row">
          <span>© {new Date().getFullYear()} Ministry of Education, Government of India.</span>
          <span className="inline-flex items-center gap-2 rounded-full bg-sp-bg-sunken px-3 py-1 font-bold text-sp-ink-2">
            🇮🇳 Made in Bharat
          </span>
        </div>
      </div>
    </footer>
  );
}
