import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Navbar } from '../../components/navbar';
import { CreditBalanceCard } from '../../components/credit-balance-card';
import { RecentTransactions } from '../../components/recent-transactions';
import { AgentList } from '../../components/agent-list';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/');

  let user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      agents: true,
      transactions: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });

  if (!user) {
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    const email = clerkUser.emailAddresses?.[0]?.emailAddress;

    user = await prisma.user.create({
      data: {
        id: userId,
        email: email ?? '',
        name: clerkUser.firstName ?? null,
      },
      include: {
        agents: true,
        transactions: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
  }

  const rulesCount = await prisma.spendingRule.count({
    where: { userId, enabled: true },
  });

  const totalTransactions = await prisma.transaction.count({
    where: { userId },
  });

  return (
    <div className="bg-white text-slate-800 font-sans min-h-screen overflow-x-hidden">
      <Navbar active="dashboard" />
      <main className="px-8 py-10 max-w-[1080px] mx-auto">
        <h2 className="text-3xl font-extrabold tracking-tight italic mb-10">Dashboard</h2>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <a href="/rules" className="no-underline">
            <div className="rounded-xl border border-black/10 bg-white p-5 hover:border-amber-200 hover:shadow-sm transition-all">
              <p className="text-[10px] font-mono text-slate-400 mb-1">Reglas activas</p>
              <p className="text-2xl font-extrabold text-slate-800">{rulesCount}</p>
              <p className="text-[10px] font-mono text-amber-600 mt-1">Gestionar &rarr;</p>
            </div>
          </a>
          <a href="/transactions" className="no-underline">
            <div className="rounded-xl border border-black/10 bg-white p-5 hover:border-amber-200 hover:shadow-sm transition-all">
              <p className="text-[10px] font-mono text-slate-400 mb-1">Transacciones</p>
              <p className="text-2xl font-extrabold text-slate-800">{totalTransactions}</p>
              <p className="text-[10px] font-mono text-amber-600 mt-1">Ver historial &rarr;</p>
            </div>
          </a>
          <a href="/credits" className="no-underline">
            <div className="rounded-xl border border-black/10 bg-white p-5 hover:border-amber-200 hover:shadow-sm transition-all">
              <p className="text-[10px] font-mono text-slate-400 mb-1">Saldo</p>
              <p className="text-2xl font-extrabold text-slate-800">{user.credits.toLocaleString()}</p>
              <p className="text-[10px] font-mono text-amber-600 mt-1">Comprar &rarr;</p>
            </div>
          </a>
        </div>

        <div className="space-y-8">
          <AgentList initialAgents={user.agents} />
          <RecentTransactions transactions={user.transactions} />
        </div>
      </main>
    </div>
  );
}
