import { Request, Response } from 'express';
import {
  PropertyRepository,
  TenantRepository,
  TransactionRepository,
} from '../repositories';
import { searchQuerySchema } from '../schemas';
import type { Property, Tenant, Transaction } from '../domain';

interface PropertyHit {
  type: 'property';
  id: string;
  name: string;
  fullAddress: string;
  propertyType: string;
}

interface TenantHit {
  type: 'tenant';
  id: string;
  fullName: string;
  email: string;
}

interface TransactionHit {
  type: 'transaction';
  id: string;
  description: string;
  amount: number;
  signedAmount: number;
  isIncome: boolean;
  date: string;
  propertyId: string;
  propertyName: string;
}

type SearchHit = PropertyHit | TenantHit | TransactionHit;

const RESULT_CAP_PER_TYPE = 25;

function toPropertyHit(p: Property): PropertyHit {
  return {
    type: 'property',
    id: p.id,
    name: p.name,
    fullAddress: p.fullAddress(),
    propertyType: p.propertyType,
  };
}

function toTenantHit(t: Tenant): TenantHit {
  return {
    type: 'tenant',
    id: t.id,
    fullName: t.fullName(),
    email: t.email,
  };
}

function toTransactionHit(t: Transaction, propertyName: string): TransactionHit {
  return {
    type: 'transaction',
    id: t.id,
    description: t.description,
    amount: t.amount,
    signedAmount: t.signedAmount(),
    isIncome: t.isIncome(),
    date: t.date.toISOString(),
    propertyId: t.propertyId,
    propertyName,
  };
}

export class SearchController {
  public constructor(
    private readonly properties: PropertyRepository,
    private readonly tenants: TenantRepository,
    private readonly transactions: TransactionRepository,
  ) {}

  public search = async (req: Request, res: Response): Promise<void> => {
    const { q } = searchQuerySchema.parse(req.query);
    const ownerId = req.user!.id;

    const [propertyHits, tenantHits, transactionHits, allOwnerProperties] = await Promise.all([
      this.properties.search(q, ownerId, RESULT_CAP_PER_TYPE),
      this.tenants.search(q, ownerId, RESULT_CAP_PER_TYPE),
      this.transactions.search(q, ownerId, RESULT_CAP_PER_TYPE),
      this.properties.list({ ownerId, limit: 200, offset: 0 }),
    ]);

    const propertyNames = new Map(
      allOwnerProperties.data.map((p) => [p.id, p.name]),
    );

    const results: SearchHit[] = [
      ...propertyHits.map(toPropertyHit),
      ...tenantHits.map(toTenantHit),
      ...transactionHits.map((t) =>
        toTransactionHit(t, propertyNames.get(t.propertyId) ?? 'Unknown property'),
      ),
    ];

    res.json({
      query: q,
      totalHits: results.length,
      counts: {
        property: propertyHits.length,
        tenant: tenantHits.length,
        transaction: transactionHits.length,
      },
      results,
    });
  };
}
