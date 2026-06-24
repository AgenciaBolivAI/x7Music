'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import Navbar from '@/components/common/Navbar';
import PortalSidebar from '@/components/portal/PortalSidebar';
import { ProtectedRoute } from '@/components/auth/RouteGuards';
import AgentWidget from '@/components/agent/AgentWidget';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-brand-black flex flex-col">
        <Navbar />
        <div className="flex flex-1 pt-16">
          <PortalSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
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
    </ProtectedRoute>
  );
}
