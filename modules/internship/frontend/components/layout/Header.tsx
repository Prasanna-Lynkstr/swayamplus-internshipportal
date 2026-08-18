import Link from 'next/link';
import { NavPill } from './NavPill';

export function Header() {
  return (
    <header>
      <div className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="placeholder-logo h-9 w-9 rounded-full text-[10px]">MoE</span>
            <span className="hidden text-xs font-bold tracking-wide text-sp-ink-2 sm:inline">
              MINISTRY OF EDUCATION
            </span>
          </div>

          <Link href="/" className="flex items-center text-xl font-extrabold text-sp-blue">
            SWAYAM Plus
            <span className="ml-0.5 text-sp-orange">+</span>
          </Link>

          <span className="placeholder-logo h-9 w-9 rounded-full text-[9px]">IITM</span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-3">
        <NavPill />
      </div>
    </header>
  );
}
