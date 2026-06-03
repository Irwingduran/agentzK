'use client';

import { useRouter } from 'next/navigation';

const typeOptions = [
  { value: '', label: 'Todos' },
  { value: 'credit_purchase', label: 'Compra de créditos' },
  { value: 'credit_deduction', label: 'Deducción' },
  { value: 'x402_payment', label: 'Pago x402' },
  { value: 'bill_payment', label: 'Pago de servicio' },
];

const statusOptions = [
  { value: '', label: 'Todos' },
  { value: 'completed', label: 'Completado' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'executing', label: 'Ejecutando' },
  { value: 'failed', label: 'Fallido' },
  { value: 'cancelled', label: 'Cancelado' },
];

export function TransactionFilters({ type, status }: { type?: string; status?: string }) {
  const router = useRouter();

  function handleChange() {
    const params = new URLSearchParams();
    const form = document.getElementById('tx-filters') as HTMLFormElement;
    if (!form) return;
    const fd = new FormData(form);
    const t = fd.get('type') as string;
    const s = fd.get('status') as string;
    if (t) params.set('type', t);
    if (s) params.set('status', s);
    router.push(`/transactions${params.toString() ? '?' + params.toString() : ''}`);
  }

  return (
    <form id="tx-filters" className="flex flex-wrap gap-3 mb-8">
      <select name="type" defaultValue={type ?? ''} onChange={handleChange}
        className="text-xs font-mono px-3 py-2 rounded-lg border border-black/10 bg-white text-slate-700"
      >
        {typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <select name="status" defaultValue={status ?? ''} onChange={handleChange}
        className="text-xs font-mono px-3 py-2 rounded-lg border border-black/10 bg-white text-slate-700"
      >
        {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {(type || status) && (
        <a href="/transactions" className="text-[10px] font-mono text-amber-600 no-underline hover:text-amber-700 transition-colors self-center">
          Limpiar filtros
        </a>
      )}
    </form>
  );
}
