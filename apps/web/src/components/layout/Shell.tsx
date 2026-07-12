'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { 
  Box, 
  LayoutDashboard, 
  Package, 
  Users, 
  Calendar, 
  Wrench, 
  ShieldCheck, 
  BarChart3, 
  LogOut,
  Bell,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'ASSET_MANAGER', 'DEPT_HEAD', 'EMPLOYEE'] },
  { href: '/assets', label: 'Assets', icon: Package, roles: ['ADMIN', 'ASSET_MANAGER', 'DEPT_HEAD', 'EMPLOYEE'] },
  { href: '/allocations', label: 'Allocations', icon: Users, roles: ['ADMIN', 'ASSET_MANAGER', 'DEPT_HEAD', 'EMPLOYEE'] },
  { href: '/bookings', label: 'Bookings', icon: Calendar, roles: ['ADMIN', 'ASSET_MANAGER', 'DEPT_HEAD', 'EMPLOYEE'] },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench, roles: ['ADMIN', 'ASSET_MANAGER', 'DEPT_HEAD', 'EMPLOYEE'] },
  { href: '/audits', label: 'Audits', icon: ShieldCheck, roles: ['ADMIN', 'ASSET_MANAGER'] },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['ADMIN', 'ASSET_MANAGER', 'DEPT_HEAD'] },
  { href: '/organization', label: 'Organization', icon: Box, roles: ['ADMIN'] },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!mounted || !isAuthenticated || !user) return null;

  const allowedNavItems = navItems.filter(item => item.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
          <Link href="/dashboard" className="flex items-center gap-2 text-primary">
            <Box size={28} className="stroke-[1.5]" />
            <span className="text-xl font-bold tracking-tight">AssetFlow</span>
          </Link>
          <button className="lg:hidden" onClick={() => setMobileMenuOpen(false)}>
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="mb-6 px-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Main Menu</p>
            <nav className="space-y-1">
              {allowedNavItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <button className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900 dark:hover:text-white" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative text-gray-500">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 focus:outline-none cursor-pointer outline-none border-none bg-transparent">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-gray-900 dark:text-white leading-none">{user.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{user.role}</p>
                  </div>
                  <Avatar className="h-9 w-9 border border-gray-200 dark:border-gray-700">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {user.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile Settings</DropdownMenuItem>
                <DropdownMenuItem>Notification Preferences</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
