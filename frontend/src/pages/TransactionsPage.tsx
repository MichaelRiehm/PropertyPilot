import { Receipt } from 'lucide-react';
import PagePlaceholder from '../components/PagePlaceholder';

export default function TransactionsPage() {
  return (
    <PagePlaceholder
      title="Transactions"
      description="Income and expense entries land with the entity CRUD pass."
      icon={Receipt}
    />
  );
}
