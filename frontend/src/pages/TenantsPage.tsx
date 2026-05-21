import { Users } from 'lucide-react';
import PagePlaceholder from '../components/PagePlaceholder';

export default function TenantsPage() {
  return (
    <PagePlaceholder
      title="Tenants"
      description="Tenant management UI ships with the entity CRUD pass."
      icon={Users}
    />
  );
}
