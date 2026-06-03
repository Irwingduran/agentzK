'use client';

import { useEffect, useState } from 'react';

interface SpeiInstructions {
  clabe: string;
  reference: string;
  amount: number;
  concept: string;
  expiresAt: string;
  creditsAmount: number;
}

export function CreditPurchasePending({
  spei,
  transactionId,
}: {
  spei: SpeiInstructions;
  transactionId: string;
}) {
  const [status, setStatus] = useState<'pending' | 'completed' | 'failed'>('pending');
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    if (status !== 'pending') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/credits/status?transactionId=${transactionId}`);
        const data = await res.json();
        setPollCount((c) => c + 1);

        if (data.status === 'completed') {
          setStatus('completed');
          clearInterval(interval);
          setTimeout(() => window.location.reload(), 2000);
        } else if (data.status === 'failed') {
          setStatus('failed');
          clearInterval(interval);
        }
      } catch {
        // keep polling
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [status, transactionId]);

  const formattedAmount = spei.amount.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  });

  return (
    <div className="space-y-5 rounded-xl border border-black/10 bg-white p-6">
      {status === 'completed' ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <span className="text-emerald-600 text-lg font-bold">✓</span>
          </div>
          <p className="text-sm font-bold text-slate-800">¡Pago recibido!</p>
          <p className="text-xs font-mono text-slate-500 mt-1">
            {spei.creditsAmount.toLocaleString()} créditos acreditados
          </p>
          <p className="text-[10px] font-mono text-slate-400 mt-3">Redirigiendo al dashboard...</p>
        </div>
      ) : status === 'failed' ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
            <span className="text-red-600 text-lg font-bold">✕</span>
          </div>
          <p className="text-sm font-bold text-slate-800">El depósito no se completó</p>
          <p className="text-xs font-mono text-slate-500 mt-1">El tiempo para depositar expiró o el pago fue rechazado.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-xs font-mono font-bold px-4 py-2 rounded-lg bg-slate-900 text-white cursor-pointer hover:bg-slate-800 transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-xs font-mono text-amber-800">Instrucciones SPEI</p>
            <p className="text-[10px] text-amber-700 mt-1">
              Transfiere el monto exacto desde tu banco. Los créditos se activan automáticamente al confirmarse el pago.
            </p>
          </div>

          <div className="space-y-3 bg-slate-50 rounded-lg border border-black/5 p-4">
            <div>
              <p className="text-[10px] font-mono text-slate-400 mb-0.5">CLABE</p>
              <p className="text-sm font-mono font-bold text-slate-800 tracking-wider select-all">{spei.clabe}</p>
            </div>
            <div>
              <p className="text-[10px] font-mono text-slate-400 mb-0.5">Referencia</p>
              <p className="text-sm font-mono font-bold text-slate-800 select-all">{spei.reference}</p>
            </div>
            <div>
              <p className="text-[10px] font-mono text-slate-400 mb-0.5">Monto</p>
              <p className="text-sm font-mono font-bold text-slate-800">{formattedAmount}</p>
            </div>
            <div>
              <p className="text-[10px] font-mono text-slate-400 mb-0.5">Concepto</p>
              <p className="text-sm font-mono text-slate-700">{spei.concept}</p>
            </div>
            <div>
              <p className="text-[10px] font-mono text-slate-400 mb-0.5">Recibirás</p>
              <p className="text-sm font-mono font-bold text-amber-600">{spei.creditsAmount.toLocaleString()} créditos</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Esperando pago{pollCount > 0 ? ` (${pollCount * 5}s)` : ''}...
          </div>
        </>
      )}
    </div>
  );
}
