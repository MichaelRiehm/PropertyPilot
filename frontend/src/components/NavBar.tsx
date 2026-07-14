import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  DoorOpen,
  FileText,
  Home,
  LineChart,
  LogOut,
  Menu,
  Receipt,
  Users,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SearchBar from './SearchBar';
import MobileNavDrawer, { type MobileNavItem } from './MobileNavDrawer';

const NAV_ITEMS: MobileNavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/properties', label: 'Properties', icon: Building2 },
  { to: '/units', label: 'Units', icon: DoorOpen },
  { to: '/tenants', label: 'Tenants', icon: Users },
  { to: '/leases', label: 'Leases', icon: FileText },
  { to: '/transactions', label: 'Transactions', icon: Receipt },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/forecast', label: 'Forecast', icon: LineChart },
];

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-3">
        <div className="flex items-center gap-3 md:gap-4 md:flex-wrap">
          <NavLink
            to="/dashboard"
            aria-label="Go to dashboard"
            className="text-lg font-bold text-slate-900 tracking-tight hover:text-slate-700"
          >
            PropertyPilot
          </NavLink>
          <div className="flex-1 min-w-0 md:min-w-[240px]">
            <SearchBar />
          </div>
          {/* Desktop-only: email + log out. Mobile: same info lives in the drawer. */}
          <div className="hidden items-center gap-3 text-sm md:flex">
            {user && (
              <span className="hidden text-slate-500 lg:inline">{user.email}</span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Log out</span>
            </button>
          </div>
          {/* Mobile-only: hamburger opens the drawer. */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:hidden"
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <nav
          className="mt-3 hidden flex-wrap items-center gap-1 md:flex"
          aria-label="Primary"
        >
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      <MobileNavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onLogout={handleLogout}
        navItems={NAV_ITEMS}
        userEmail={user?.email}
      />
    </header>
  );
}
