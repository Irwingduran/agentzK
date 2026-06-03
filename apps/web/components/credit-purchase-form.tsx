'use client';

import { useState } from 'react';
import { CreditPurchasePending } from './credit-purchase-pending';

interface SpeiInstructions {
  clabe: string;
  reference: string;
  amount: number;
  concept: string;
  expiresAt: string;
  creditsAmount: number;
}

export function CreditPurchaseForm() {
  const [amount, setAmount] = useState(500);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [spei, setSpei] = useState<SpeiInstructions | null>(null);
  const [transactionId, setTransactionId] = useState('');

  const estimatedCredits = amount * 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountMXN: amount }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Error al procesar');
        return;
      }

      if (data.mock) {
        window.location.reload();
        return;
      }

      setTransactionId(data.transactionId);
      setSpei({
        clabe: data.speiClabe,
        reference: data.speiReference,
        amount: data.speiAmount,
        concept: data.speiConcept,
        expiresAt: data.speiExpiresAt,
        creditsAmount: data.creditsAmount,
      });
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  if (spei) {
    return <CreditPurchasePending spei={spei} transactionId={transactionId} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-black/10 bg-white p-6">
      <div>
        <label className="text-xs font-mono text-slate-500 block mb-1.5">Monto en MXN</label>
        <input
          type="number"
          min={50}
          max={10000}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full text-sm font-mono px-3 py-2.5 rounded-lg border border-black/10 bg-white text-slate-700"
        />
      </div>

      <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
        <p className="text-xs font-mono text-amber-800">Pago vía SPEI — Bitso</p>
        <p className="text-[10px] text-amber-700 mt-1 leading-relaxed">
          Transfiere el monto a la CLABE que aparece al confirmar. Los créditos se acreditan automáticamente al recibir el pago.
        </p>
      </div>

      <div className="border-t border-black/5 pt-4">
        <p className="text-sm text-slate-700">
          Recibirás <strong className="text-amber-600">{estimatedCredits.toLocaleString()} créditos</strong>
        </p>
        <p className="text-[10px] font-mono text-slate-400 mt-0.5">
          1 crédito ≈ $0.01 MXM · 1 MXN = 100 créditos
        </p>
      </div>

      {error && (
        <p className="text-xs font-mono text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full text-xs font-mono font-bold px-4 py-2.5 rounded-lg bg-slate-900 text-white border-none cursor-pointer hover:bg-slate-800 transition-colors disabled:opacity-50"
      >
        {loading ? 'Generando instrucciones...' : 'Generar instrucciones SPEI'}
      </button>
    </form>
  );
}
