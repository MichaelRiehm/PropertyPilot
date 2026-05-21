import { Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-slate-500">
          Welcome back{user?.email ? `, ${user.email}` : ''}.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Home className="h-6 w-6 text-slate-500" aria-hidden="true" />
        </div>
        <p className="text-sm text-slate-500">
          Cash flow summary, occupancy, and recent activity will appear here.
        </p>
      </div>
    </div>
  );
}
