import { LineChart } from 'lucide-react';
import PagePlaceholder from '../components/PagePlaceholder';

export default function ForecastPage() {
  return (
    <PagePlaceholder
      title="12-month cash flow forecast"
      description="The forecast endpoint and chart arrive after the reports pass."
      icon={LineChart}
    />
  );
}
