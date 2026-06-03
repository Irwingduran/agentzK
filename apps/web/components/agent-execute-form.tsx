'use client';

import { useState } from 'react';

const SERVICES = [
  { value: 'cfe', label: 'CFE' },
  { value: 'telmex', label: 'Telmex' },
  { value: 'telcel', label: 'Telcel' },
  { value: 'izzi', label: 'Izzi' },
];

export function AgentExecuteForm({ agentId, credits }: { agentId: string; credits: number }) {
  const [service, setService] = useState('cfe');
  const [amount, setAmount] = useState('100');
  const [loading, setLoading] = useState<'simular' | 'ejecutar' | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);

  async function execute(action: 'test' | 'bill_payment') {
    setLoading(action === 'test' ? 'simular' : 'ejecutar');
    setResult(null);

    try {
      const res = await fetch(`/api/agents/${agentId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, service, amount: Number(amount) }),
      });

      const data = await res.json();
      setResult({
        success: res.ok,
        message: data.message || data.error || 'OK',
        details: data.reason || (data.txHash ? `TX: ${data.txHash}` : undefined),
      });
    } catch {
      setResult({ success: false, message: 'Error de conexión' });
    } finally {
      setLoading(null);
    }
  }

  return (
    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-4">Probar ejecución</h3>
      <div className="rounded-lg border border-black/10 bg-white p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-mono text-slate-500 mb-1 block">Servicio</label>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full text-xs font-mono border border-black/10 rounded-lg px-3 py-2 bg-white text-slate-800"
            >
              {SERVICES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-mono text-slate-500 mb-1 block">Monto (créditos)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={1}
              className="w-full text-xs font-mono border border-black/10 rounded-lg px-3 py-2 bg-white text-slate-800"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => execute('test')}
            disabled={!!loading}
            className="flex-1 text-xs font-mono font-bold px-4 py-2.5 rounded-lg border border-black/10 bg-white text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40"
          >
            {loading === 'simular' ? 'Verificando...' : '🔍 Simular'}
          </button>
          <button
            onClick={() => execute('bill_payment')}
            disabled={!!loading || Number(amount) > credits}
            className="flex-1 text-xs font-mono font-bold px-4 py-2.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-40"
          >
            {loading === 'ejecutar' ? 'Ejecutando...' : '⚡ Ejecutar'}
          </button>
        </div>

        {Number(amount) > credits && (
          <p className="text-[10px] font-mono text-red-500">Créditos insuficientes (tienes {credits})</p>
        )}

        {result && (
          <div className={`text-xs font-mono p-3 rounded-lg border ${result.success ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
            <p className="font-bold">{result.message}</p>
            {result.details && <p className="mt-1 opacity-70">{result.details}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
