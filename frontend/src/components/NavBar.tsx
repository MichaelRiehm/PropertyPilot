import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  DoorOpen,
  FileText,
  Home,
  LineChart,
  LogOut,
  Receipt,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SearchBar from './SearchBar';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/properties', label: 'Properties', icon: Building2 },
  { to: '/units', label: 'Units', icon: DoorOpen },
  { to: '/tenants', label: 'Tenants', icon: Users },
  { to: '/leases', label: 'Leases', icon: FileText },
  { to: '/transactions', label: 'Transactions', icon: Receipt },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/forecast', label: 'Forecast', icon: LineChart },
];

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <NavLink
            to="/dashboard"
            aria-label="Go to dashboard"
            className="text-lg font-bold text-slate-900 tracking-tight hover:text-slate-700"
          >
            PropertyPilot
          </NavLink>
          <div className="flex-1 min-w-[240px]">
            <SearchBar />
          </div>
          <div className="flex items-center gap-3 text-sm">
            {user && (
              <span className="hidden text-slate-500 md:inline">{user.email}</span>
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
        </div>
        <nav className="mt-3 flex flex-wrap items-center gap-1">
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
    </header>
  );
}
