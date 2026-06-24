'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import Navbar from '@/components/common/Navbar';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { AdminRoute } from '@/components/auth/RouteGuards';
import AgentWidget from '@/components/agent/AgentWidget';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <AdminRoute>
      <div className="min-h-screen bg-brand-black flex flex-col">
        <Navbar />
        <div className="flex flex-1 pt-16">
          <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className="flex-1 overflow-auto">
            <button
              className="lg:hidden m-4 p-2 rounded-lg bg-brand-gray text-brand-gray-muted hover:text-white"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            {children}
          </main>
        </div>
        <AgentWidget />
      </div>
    </AdminRoute>
  );
}
