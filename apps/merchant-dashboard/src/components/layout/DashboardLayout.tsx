import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { HelpProvider } from '@/contexts/HelpContext';
import { HelpWidget } from '@/components/support/HelpWidget';

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isFullBleedPage = location.pathname === '/theme';

  return (
    <HelpProvider>
      <div className="flex h-screen bg-surface-1 overflow-hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar onToggleSidebar={() => setSidebarOpen(v => !v)} />
          <main className={`flex-1 min-h-0 ${isFullBleedPage ? 'overflow-hidden p-0' : 'overflow-y-auto p-5'}`} dir="rtl">
            <Outlet />
          </main>
        </div>
      </div>
      <HelpWidget />
    </HelpProvider>
  );
}
