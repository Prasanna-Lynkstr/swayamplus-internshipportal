'use client';

import { useState } from 'react';
import { CompanyProfileModal } from './CompanyProfileModal';

// A company name that opens a quick profile peek in a modal instead of
// navigating away — used anywhere an internship's employer name is shown
// (the browse-page card, the detail page header) so both behave the same way.
export function EmployerNameTrigger({
  employerId,
  orgName,
  className,
}: {
  employerId: number;
  orgName: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={className}
      >
        {orgName}
      </button>
      <CompanyProfileModal employerId={employerId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
