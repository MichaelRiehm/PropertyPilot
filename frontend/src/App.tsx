import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PropertiesPage from './pages/PropertiesPage';
import UnitsPage from './pages/UnitsPage';
import TenantsPage from './pages/TenantsPage';
import LeasesPage from './pages/LeasesPage';
import TransactionsPage from './pages/TransactionsPage';
import MaintenanceTicketsPage from './pages/MaintenanceTicketsPage';
import ReportsPage from './pages/ReportsPage';
import ForecastPage from './pages/ForecastPage';
import SearchPage from './pages/SearchPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      {/* Public auth pages */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected app shell */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/properties" element={<PropertiesPage />} />
          <Route path="/units" element={<UnitsPage />} />
          <Route path="/tenants" element={<TenantsPage />} />
          <Route path="/leases" element={<LeasesPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/maintenance" element={<MaintenanceTicketsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/forecast" element={<ForecastPage />} />
          <Route path="/search" element={<SearchPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
