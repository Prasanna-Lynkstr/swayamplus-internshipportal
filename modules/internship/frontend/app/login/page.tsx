import { redirect } from 'next/navigation';
import { LoginCard } from '@/components/auth/LoginCard';
import { getServerAuthUser } from '@/lib/serverAuth';

interface Props {
  searchParams: Promise<{ role?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const [user, params] = await Promise.all([getServerAuthUser(), searchParams]);

  if (user?.role === 'employer') redirect('/employer/dashboard');
  if (user?.role === 'student') redirect('/student/dashboard');
  if (user?.role === 'admin') redirect('/admin/dashboard');

  const initialRole = params.role === 'employer' ? 'employer' : 'student';

  return (
    <div className="mx-auto max-w-md py-8">
      <LoginCard initialRole={initialRole} />
    </div>
  );
}
