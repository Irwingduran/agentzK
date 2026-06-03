import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Navbar } from '../../components/navbar';
import { TransactionFilters } from '../../components/transaction-filters';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { page?: string; type?: string; status?: string };
}) {
  const { userId } = await auth();
  if (!userId) redirect('/');

  const page = Math.max(1, Number(searchParams.page) || 1);
  const typeFilter = searchParams.type;
  const statusFilter = searchParams.status;

  const where: Record<string, unknown> = { userId };
  if (typeFilter && ['credit_purchase', 'credit_deduction', 'x402_payment', 'bill_payment'].includes(typeFilter)) {
    where.type = typeFilter;
  }
  if (statusFilter && ['pending', 'executing', 'completed', 'failed', 'cancelled'].includes(statusFilter)) {
    where.status = statusFilter;
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { agent: { select: { name: true } } },
    }),
    prisma.transaction.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const statusColor: Record<string, string> = {
    completed: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    pending: 'bg-amber-50 text-amber-600 border-amber-200',
    executing: 'bg-blue-50 text-blue-600 border-blue-200',
    failed: 'bg-red-50 text-red-600 border-red-200',
    cancelled: 'bg-slate-50 text-slate-400 border-slate-200',
  };

  return (
    <div className="bg-white text-slate-800 font-sans min-h-screen overflow-x-hidden">
      <Navbar active="dashboard" />
      <main className="px-8 py-10 max-w-[1080px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight italic">Historial</h2>
          <p className="text-xs font-mono text-slate-400">{total} transacciones</p>
        </div>

        <TransactionFilters type={typeFilter} status={statusFilter} />

        {/* Table */}
        {transactions.length === 0 ? (
          <p className="text-xs text-slate-400 font-mono py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            No hay transacciones
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-black/10">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="bg-slate-50 border-b border-black/5">
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Fecha</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Tipo</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Descripción</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Agente</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-500">Monto</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-500">Estado</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-black/5 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {tx.type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate">{tx.description}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {tx.agent?.name ?? '—'}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${tx.amount >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {tx.amount >= 0 ? '-' : '+'}${Math.abs(tx.amount).toLocaleString()}
                      <span className="text-[9px] text-slate-400 ml-0.5">{tx.currency}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${statusColor[tx.status] ?? ''}`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {page > 1 && (
              <a
                href={`/transactions?page=${page - 1}${typeFilter ? `&type=${typeFilter}` : ''}${statusFilter ? `&status=${statusFilter}` : ''}`}
                className="text-xs font-mono px-3 py-1.5 rounded-lg border border-black/10 text-slate-500 no-underline hover:bg-slate-50 transition-colors"
              >
                &larr; Anterior
              </a>
            )}
            <span className="text-xs font-mono text-slate-400">
              Página {page} de {totalPages}
            </span>
            {page < totalPages && (
              <a
                href={`/transactions?page=${page + 1}${typeFilter ? `&type=${typeFilter}` : ''}${statusFilter ? `&status=${statusFilter}` : ''}`}
                className="text-xs font-mono px-3 py-1.5 rounded-lg border border-black/10 text-slate-500 no-underline hover:bg-slate-50 transition-colors"
              >
                Siguiente &rarr;
              </a>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
