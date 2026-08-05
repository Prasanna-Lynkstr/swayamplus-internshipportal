'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [location, setLocation] = useState(searchParams.get('location') ?? '');
  const [domain, setDomain] = useState(searchParams.get('domain') ?? '');
  const [mode, setMode] = useState(searchParams.get('mode') ?? '');

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (location) params.set('location', location);
    if (domain) params.set('domain', domain);
    if (mode) params.set('mode', mode);
    router.push(`/internships?${params.toString()}`);
  };

  return (
    <form
      onSubmit={applyFilters}
      className="grid grid-cols-1 gap-3 rounded-sp-xl border border-black/5 bg-sp-bg-elev p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5"
    >
      <Input
        placeholder="Search title or description"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="lg:col-span-2"
      />
      <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
      <Input placeholder="Domain (e.g. IT/ITeS)" value={domain} onChange={(e) => setDomain(e.target.value)} />
      <Select value={mode} onChange={(e) => setMode(e.target.value)}>
        <option value="">Any work mode</option>
        <option value="remote">Remote</option>
        <option value="onsite">Onsite</option>
        <option value="hybrid">Hybrid</option>
      </Select>
      <Button type="submit" className="lg:col-span-5 justify-self-start">
        Apply filters
      </Button>
    </form>
  );
}
