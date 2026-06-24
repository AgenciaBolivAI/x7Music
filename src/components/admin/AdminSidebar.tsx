'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Inbox,
  CalendarDays,
  Clock,
  Users,
  Music,
  Mic2,
  Calendar,
  FileText,
  FileSignature,
  BookOpen,
  FolderOpen,
  Mail,
  Brain,
  Gift,
  PenLine,
  ScrollText,
  Settings,
  X,
} from 'lucide-react';
import { getUnreadCount } from '@/api/messageApi';

const navItems = [
  { label: 'Dashboard',    to: '/admin',              icon: LayoutDashboard, end: true },
  { label: 'Inbox',        to: '/admin/inbox',        icon: Inbox,           badge: true },
  { label: 'Bookings',     to: '/admin/bookings',     icon: CalendarDays },
  { label: 'Availability', to: '/admin/availability', icon: Clock },
  { label: 'Clients',      to: '/admin/clients',      icon: Users },
  { label: 'Catalog',      to: '/admin/catalog',      icon: Music },
  { label: 'Artists',      to: '/admin/artists',      icon: Mic2 },
  { label: 'Split Sheets', to: '/admin/split-sheets', icon: FileSignature },
  { label: 'Agreements',   to: '/admin/agreements',   icon: PenLine },
  { label: 'Doc Templates', to: '/admin/agreement-templates', icon: ScrollText },
  { label: 'Releases',     to: '/admin/releases',     icon: Music },
  { label: 'Events',       to: '/admin/events',       icon: Calendar },
  { label: 'Blog / Press', to: '/admin/blog',         icon: BookOpen },
  { label: 'Services',     to: '/admin/services',     icon: FileText },
  { label: 'Newsletter',   to: '/admin/subscribers',  icon: Mail },
  { label: 'Free Resources', to: '/admin/resources',  icon: Gift },
  { label: 'Company Brain', to: '/admin/brain',       icon: Brain },
  { label: 'Documents',    to: '/admin/documents',    icon: FolderOpen },
  { label: 'Settings',     to: '/admin/settings',     icon: Settings },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ open, onClose }: Props) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    getUnreadCount()
      .then((res) => setUnread(res.data.count))
      .catch(() => {});
    const interval = setInterval(() => {
      getUnreadCount()
        .then((res) => setUnread(res.data.count))
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const isActive = (to: string, end?: boolean) => (end ? pathname === to : pathname.startsWith(to));

  return (
    <>
      {/* Backdrop (mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-16 left-0 z-30 w-64 bg-brand-gray flex flex-col
          transform transition-transform duration-200
          h-[calc(100%-4rem)]
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:top-0 lg:h-screen lg:translate-x-0 lg:z-auto lg:shrink-0`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <span className="font-heading font-bold text-white text-lg">X7 Admin</span>
          <button onClick={onClose} className="lg:hidden text-brand-gray-muted hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-0.5">
            {navItems.map(({ label, to, icon: Icon, end, badge }) => (
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
                  <span className="flex-1">{label}</span>
                  {badge && unread > 0 && (
                    <span className="min-w-[1.25rem] h-5 px-1 bg-brand-red text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-xs text-brand-gray-muted">X7 Music Group</p>
          <p className="text-xs text-brand-gray-muted">Admin Panel</p>
        </div>
      </aside>
    </>
  );
}
