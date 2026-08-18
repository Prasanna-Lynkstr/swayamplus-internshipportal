import { Card } from '@/components/ui/Card';
import { EoiForm } from '@/components/employer/EoiForm';
import { apiFetch } from '@/lib/api';

async function isRegistrationOpen(): Promise<boolean> {
  try {
    const { open } = await apiFetch<{ open: boolean }>('/employers/registration-status');
    return open;
  } catch {
    // Fail open on a transient error rather than blocking every submission —
    // the backend re-checks this same flag at submit time regardless (see
    // EmployerEoiService.create), so this is purely a friendlier up-front
    // message, not the actual gate.
    return true;
  }
}

export default async function EoiPage() {
  const open = await isRegistrationOpen();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-sp-orange-ink">
          Employers
        </span>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-sp-navy sm:text-4xl">
          Submit an Expression of Interest
        </h1>
        <p className="mt-2 text-sp-ink-2">
          No account needed to get started. Tell us about your organization — our admin team
          reviews every submission before an employer account is created.
        </p>
      </div>

      <Card className="p-6 sm:p-8">
        {open ? (
          <EoiForm />
        ) : (
          <p className="text-sm font-semibold text-sp-ink-2">
            New employer registrations are temporarily paused. Please check back soon.
          </p>
        )}
      </Card>
    </div>
  );
}
