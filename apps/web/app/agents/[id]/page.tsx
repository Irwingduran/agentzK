import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Navbar } from '../../../components/navbar';
import { AgentExecuteForm } from '../../../components/agent-execute-form';

export const dynamic = 'force-dynamic';

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect('/');

  const { id } = await params;

  const agent = await prisma.agent.findUnique({
    where: { id },
  });

  if (!agent || agent.userId !== userId) notFound();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });

  const rules = await prisma.spendingRule.findMany({
    where: { userId, OR: [{ agentId: id }, { agentId: null }] },
    orderBy: { createdAt: 'desc' },
  });

  const transactions = await prisma.transaction.findMany({
    where: { agentId: id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const wallet = await prisma.wallet.findFirst({
    where: { agentId: id },
  });

  const serviceLabel = (v: string) => {
    const labels: Record<string, string> = { cfe: 'CFE', telmex: 'Telmex', telcel: 'Telcel', izzi: 'Izzi' };
    return labels[v] ?? v;
  };

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
        {/* Agent header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <a href="/dashboard" className="text-[10px] font-mono text-slate-400 no-underline hover:text-slate-600 transition-colors">&larr; Dashboard</a>
            <h2 className="text-3xl font-extrabold tracking-tight italic mt-2 mb-1">{agent.name}</h2>
            <p className="text-xs font-mono text-slate-400">{agent.networkId}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono text-slate-400 mb-1">Wallet</p>
            {wallet ? (
              <div>
                <code className="text-xs font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-black/5">
                  {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                </code>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">{wallet.networkId}</p>
              </div>
            ) : (
              <p className="text-xs font-mono text-slate-300">Sin wallet</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Rules */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800">Reglas de gasto</h3>
              <a href="/rules" className="text-[10px] font-mono text-amber-600 no-underline hover:text-amber-700 transition-colors">Gestionar</a>
            </div>
            {rules.length === 0 ? (
              <p className="text-xs text-slate-400 font-mono py-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                Sin reglas configuradas
              </p>
            ) : (
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div key={rule.id} className={`rounded-lg border ${rule.enabled ? 'border-black/10' : 'border-black/5 opacity-50'} bg-white p-4`}>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                        {serviceLabel(rule.service)}
                      </span>
                      <span className="text-xs font-bold text-slate-800">${rule.maxAmount.toLocaleString()} MXN</span>
                      {rule.requiresConfirmation && (
                        <span className="text-[10px] font-mono text-slate-400">
                          confirma &gt; ${rule.confirmationThreshold?.toLocaleString() ?? rule.maxAmount} MXN
                        </span>
                      )}
                      {rule.scheduleType && (
                        <span className="text-[10px] font-mono text-slate-400">
                          {rule.scheduleType === 'monthly' ? `Día ${rule.scheduleDay}` : rule.scheduleType}
                          {rule.scheduleTime ? ` ${rule.scheduleTime}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent transactions */}
          <section>
            <h3 className="text-sm font-bold text-slate-800 mb-4">Transacciones recientes</h3>
            {transactions.length === 0 ? (
              <p className="text-xs text-slate-400 font-mono py-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                Sin transacciones todavía
              </p>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div key={tx.id} className="rounded-lg border border-black/10 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">{tx.description}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {tx.type.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xs font-bold ${tx.amount >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {tx.amount >= 0 ? '-' : '+'}${Math.abs(tx.amount).toLocaleString()} {tx.currency}
                        </p>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${statusColor[tx.status] ?? 'bg-slate-50 text-slate-400'}`}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <a href="/transactions" className="text-[10px] font-mono text-amber-600 no-underline hover:text-amber-700 transition-colors mt-3 inline-block">
              Ver historial completo &rarr;
            </a>
          </section>
        </div>

        {/* Execute form */}
        <div className="mt-10 max-w-md">
          <AgentExecuteForm agentId={id} credits={user?.credits ?? 0} />
        </div>
      </main>
    </div>
  );
}
