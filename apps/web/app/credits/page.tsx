import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Navbar } from '../../components/navbar';
import { CreditPurchaseForm } from '../../components/credit-purchase-form';

export const dynamic = 'force-dynamic';

export default async function CreditsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/');

  return (
    <div className="bg-white text-slate-800 font-sans min-h-screen overflow-x-hidden">
      <Navbar active="credits" />
      <main className="px-8 py-10 max-w-[1080px] mx-auto">
        <h2 className="text-3xl font-extrabold tracking-tight italic mb-3">Comprar créditos</h2>
        <p className="text-sm text-slate-500 mb-10 max-w-[480px]">
          Carga créditos para que tu agente pueda pagar servicios y APIs de forma autónoma.
        </p>
        <CreditPurchaseForm />
      </main>
    </div>
  );
}
