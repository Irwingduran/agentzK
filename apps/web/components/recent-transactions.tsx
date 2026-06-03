import type { Transaction } from '@/lib/prisma';

const statusColors: Record<string, string> = {
  completed: 'text-green-600 bg-green-50',
  pending: 'text-yellow-600 bg-yellow-50',
  failed: 'text-red-600 bg-red-50',
  executing: 'text-blue-600 bg-blue-50',
  cancelled: 'text-gray-500 bg-gray-50',
};

export function RecentTransactions({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h3 className="mb-2 font-semibold">Transacciones recientes</h3>
        <p className="text-sm text-gray-500">Aún no hay transacciones.</p>
        <a href="/transactions" className="text-[10px] font-mono text-amber-600 no-underline hover:text-amber-700 transition-colors mt-3 inline-block">
          Ver historial completo &rarr;
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="mb-4 font-semibold">Transacciones recientes</h3>
      <div className="space-y-2">
        {transactions.map((tx) => (
          <div key={tx.id} className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm">
            <div>
              <span className="font-medium capitalize">{tx.type.replace('_', ' ')}</span>
              <p className="text-xs text-gray-500">{tx.description}</p>
            </div>
            <div className="text-right">
              <span className="tabular-nums">{tx.amount} {tx.currency}</span>
              <p className={`text-xs ${statusColors[tx.status] ?? ''}`}>
                {tx.status}
              </p>
            </div>
          </div>
        ))}
      </div>
      <a href="/transactions" className="text-[10px] font-mono text-amber-600 no-underline hover:text-amber-700 transition-colors mt-3 inline-block">
        Ver historial completo &rarr;
      </a>
    </div>
  );
}
