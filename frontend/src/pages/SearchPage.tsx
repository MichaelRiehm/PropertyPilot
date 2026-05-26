import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BarChart3, Building2, Receipt, Search as SearchIcon, Users } from 'lucide-react';
import { useApiQuery } from '../lib/useApi';
import {
  search,
  type PropertyHit,
  type TenantHit,
  type TransactionHit,
  type SearchHit,
} from '../lib/search';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function isProperty(hit: SearchHit): hit is PropertyHit {
  return hit.type === 'property';
}
function isTenant(hit: SearchHit): hit is TenantHit {
  return hit.type === 'tenant';
}
function isTransaction(hit: SearchHit): hit is TransactionHit {
  return hit.type === 'transaction';
}

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get('q')?.trim() ?? '';

  const query = useApiQuery(
    () => (q ? search(q) : Promise.resolve(null)),
    [q],
  );

  if (!q) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <SearchIcon className="h-6 w-6 text-slate-500" aria-hidden="true" />
        </div>
        <h1 className="text-base font-semibold text-slate-900">Search</h1>
        <p className="mt-1 text-sm text-slate-500">
          Type a query in the search bar above to find properties, tenants, and
          transactions.
        </p>
      </div>
    );
  }

  if (query.loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
        Searching for "{q}"...
      </div>
    );
  }

  if (query.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm font-medium text-red-800">Search failed.</p>
        <p className="mt-1 text-sm text-red-700">{query.error.message}</p>
        <button
          type="button"
          onClick={() => void query.refresh()}
          className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          Try again
        </button>
      </div>
    );
  }

  const response = query.data;
  if (!response) return null;

  const properties = response.results.filter(isProperty);
  const tenants = response.results.filter(isTenant);
  const transactions = response.results.filter(isTransaction);

  if (response.totalHits === 0) {
    return (
      <div className="space-y-4">
        <Header q={q} totalHits={0} />
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <SearchIcon className="h-6 w-6 text-slate-500" aria-hidden="true" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">No matches</h2>
          <p className="mt-1 text-sm text-slate-500">
            Nothing matched "{q}" in your properties, tenants, or transactions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header q={q} totalHits={response.totalHits} />

      {properties.length > 0 && (
        <Section
          title="Properties"
          count={properties.length}
          icon={<Building2 className="h-5 w-5 text-slate-500" aria-hidden="true" />}
        >
          <ResultsTable
            headers={['Name', 'Address', 'Type']}
            rows={properties.map((hit) => ({
              key: hit.id,
              to: '/properties',
              cells: [
                <span className="font-medium text-slate-900">{hit.name}</span>,
                <span className="text-slate-700">{hit.fullAddress}</span>,
                <span className="text-slate-500">{hit.propertyType.replace('_', ' ')}</span>,
              ],
            }))}
          />
        </Section>
      )}

      {tenants.length > 0 && (
        <Section
          title="Tenants"
          count={tenants.length}
          icon={<Users className="h-5 w-5 text-slate-500" aria-hidden="true" />}
        >
          <ResultsTable
            headers={['Name', 'Email']}
            rows={tenants.map((hit) => ({
              key: hit.id,
              to: '/tenants',
              cells: [
                <span className="font-medium text-slate-900">{hit.fullName}</span>,
                <span className="text-slate-700">{hit.email}</span>,
              ],
            }))}
          />
        </Section>
      )}

      {transactions.length > 0 && (
        <Section
          title="Transactions"
          count={transactions.length}
          icon={<Receipt className="h-5 w-5 text-slate-500" aria-hidden="true" />}
        >
          <ResultsTable
            headers={['Date', 'Description', 'Property', 'Amount']}
            rows={transactions.map((hit) => ({
              key: hit.id,
              to: '/transactions',
              cells: [
                <span className="text-slate-700">
                  {new Date(hit.date).toLocaleDateString()}
                </span>,
                <span className="font-medium text-slate-900">{hit.description}</span>,
                <span className="text-slate-700">{hit.propertyName}</span>,
                <span
                  className={`font-medium ${
                    hit.isIncome ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {currencyFormatter.format(hit.signedAmount)}
                </span>,
              ],
            }))}
          />
        </Section>
      )}

      {response.totalHits >= 75 && (
        <p className="text-sm text-slate-500">
          Showing the first 25 matches per category. Refine your search for narrower results.
        </p>
      )}
    </div>
  );
}

function Header({ q, totalHits }: { q: string; totalHits: number }) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900">Search results</h1>
      <p className="mt-1 text-sm text-slate-500">
        {totalHits} {totalHits === 1 ? 'match' : 'matches'} for "{q}".
      </p>
    </div>
  );
}

function Section({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count: number;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
          {icon}
        </span>
        <h2 className="text-base font-semibold text-slate-900">
          {title}
          <span className="ml-2 text-xs font-normal text-slate-500">
            {count} {count === 1 ? 'match' : 'matches'}
          </span>
        </h2>
      </div>
      {children}
    </section>
  );
}

interface ResultRow {
  key: string;
  to: string;
  cells: ReactNode[];
}

function ResultsTable({ headers, rows }: { headers: string[]; rows: ResultRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {h}
              </th>
            ))}
            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              <BarChart3 className="ml-auto h-4 w-4 opacity-0" aria-hidden="true" />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => (
            <tr key={row.key} className="hover:bg-slate-50">
              {row.cells.map((cell, i) => (
                <td key={i} className="whitespace-nowrap px-4 py-3 text-sm">
                  {cell}
                </td>
              ))}
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                <Link
                  to={row.to}
                  className="text-slate-500 hover:text-slate-900 hover:underline"
                >
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
