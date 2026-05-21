import { BarChart3 } from 'lucide-react';
import PagePlaceholder from '../components/PagePlaceholder';

export default function ReportsPage() {
  return (
    <PagePlaceholder
      title="Reports"
      description="Rent roll, P&L, occupancy, and maintenance aging reports arrive with Task 3.B.4."
      icon={BarChart3}
    />
  );
}
