'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  Music2,
  FolderOpen,
  User,
  X,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard',   to: '/portal',           icon: LayoutDashboard, end: true },
  { label: 'My Bookings', to: '/portal/bookings',  icon: CalendarDays },
  { label: 'My Catalog',  to: '/portal/catalog',   icon: Music2 },
  { label: 'Documents',   to: '/portal/documents', icon: FolderOpen },
  { label: 'My Profile',  to: '/portal/profile',   icon: User },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function PortalSidebar({ open, onClose }: Props) {
  const pathname = usePathname();
  const isActive = (to: string, end?: boolean) => (end ? pathname === to : pathname.startsWith(to));

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-16 left-0 z-30 w-60 bg-brand-gray flex flex-col
          transform transition-transform duration-200
          h-[calc(100%-4rem)]
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:top-0 lg:h-screen lg:translate-x-0 lg:z-auto lg:shrink-0`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <span className="font-heading font-bold text-white text-lg">My Portal</span>
          <button onClick={onClose} className="lg:hidden text-brand-gray-muted hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-0.5">
            {navItems.map(({ label, to, icon: Icon, end }) => (
              <li key={to}>
                <Link
                  href={to}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${isActive(to, end)
                      ? 'bg-brand-red text-white'
                      : 'text-brand-gray-muted hover:text-white hover:bg-white/5'}`}
                >
                  <Icon size={18} className="shrink-0" />
                  <span>{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
