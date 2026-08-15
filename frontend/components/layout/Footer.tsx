import Link from 'next/link';
import { getServerAuthUser } from '@/lib/serverAuth';

// A prior "Support"/"Legal" pair of columns (FAQ, Contact us, Terms of use,
// Privacy policy) linked to /#faq /#contact /#terms /#privacy — anchors that
// don't exist anywhere on the landing page. Removed rather than left dead;
// re-add once there's real content behind them.
export async function Footer() {
  const user = await getServerAuthUser();
  const isStudent = user?.role === 'student';
  const isEmployer = user?.role === 'employer';

  const exploreColumn = {
    title: 'Explore',
    links: [
      { href: '/internships', label: 'Browse internships' },
      {
        href: isStudent ? '/applications' : '/register/student',
        label: isStudent ? 'My applications' : 'Student registration',
      },
      {
        href: isEmployer ? '/employer/dashboard' : '/register/employer',
        label: isEmployer ? 'My internships' : 'Employer registration',
      },
    ],
  };

  const employersColumn = {
    title: 'For Employers',
    links: [
      {
        href: isEmployer ? '/employer/dashboard' : '/register/employer',
        label: isEmployer ? 'My internships' : 'Partner with us',
      },
      { href: '/admin/login', label: 'Admin sign-in' },
    ],
  };

  const columns = [exploreColumn, employersColumn];

  return (
    <footer className="mt-16 border-t border-black/5 bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-2">
        {columns.map((col) => (
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
