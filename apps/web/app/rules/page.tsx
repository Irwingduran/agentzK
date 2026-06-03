import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Navbar } from '../../components/navbar';
import { RulesManager } from '../../components/rules-manager';

export const dynamic = 'force-dynamic';

export default async function RulesPage() {
  const { userId } = await auth();
  if (!userId) redirect('/');

  const rules = await prisma.spendingRule.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="bg-white text-slate-800 font-sans min-h-screen overflow-x-hidden">
      <Navbar active="dashboard" />
      <main className="px-8 py-10 max-w-[1080px] mx-auto">
        <h2 className="text-3xl font-extrabold tracking-tight italic mb-3">Reglas de gasto</h2>
        <RulesManager initialRules={rules} />
      </main>
    </div>
  );
}
