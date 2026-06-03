'use client';

import { useState } from 'react';
import type { Agent } from '@/lib/prisma';

export function AgentList({ initialAgents }: { initialAgents: Agent[] }) {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [creating, setCreating] = useState(false);
  const [walletsLoading, setWalletsLoading] = useState<Set<string>>(new Set());

  async function createAgent() {
    const name = prompt('Nombre del agente:');
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Error al crear agente');
        return;
      }
      const agent = await res.json();
      setAgents((prev) => [agent, ...prev]);
    } catch (err) {
      alert('Error de red al crear agente. ¿El servidor está corriendo?');
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function createWallet(agentId: string) {
    setWalletsLoading((prev) => new Set(prev).add(agentId));
    try {
      const res = await fetch(`/api/agents/${agentId}/wallet`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Error al crear wallet');
        return;
      }
      const updated = await res.json();
      setAgents((prev) => prev.map((a) => (a.id === agentId ? { ...a, walletAddress: updated.address } : a)));
    } catch (err) {
      alert('Error de red al crear wallet. ¿El servidor está corriendo?');
      console.error(err);
    } finally {
      setWalletsLoading((prev) => { const next = new Set(prev); next.delete(agentId); return next; });
    }
  }

  return (
    <div className="rounded-xl border border-black/10 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-800">Tus agentes</h3>
        <button
          onClick={createAgent}
          disabled={creating}
          className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-slate-900 text-white border-none cursor-pointer hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {creating ? 'Creando...' : '+ Agente'}
        </button>
      </div>

      {agents.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center font-mono">
          No tienes agentes todavía. Crea uno para empezar.
        </p>
      ) : (
        <div className="space-y-2">
          {agents.map((agent) => (
            <div key={agent.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <a
                  href={`/agents/${agent.id}`}
                  className="font-medium text-sm text-slate-800 no-underline hover:text-amber-600 transition-colors truncate"
                >
                  {agent.name}
                </a>
                <span className="text-[10px] font-mono text-slate-400">{agent.networkId}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {agent.walletAddress ? (
                  <code className="text-[10px] font-mono text-slate-400 bg-white px-2 py-0.5 rounded border border-black/5">
                    {agent.walletAddress.slice(0, 6)}...{agent.walletAddress.slice(-4)}
                  </code>
                ) : (
                  <button
                    onClick={() => createWallet(agent.id)}
                    disabled={walletsLoading.has(agent.id)}
                    className="text-[10px] font-mono text-slate-400 bg-white px-2 py-1 rounded-lg border border-black/10 cursor-pointer hover:text-slate-600 hover:border-slate-300 transition-colors disabled:opacity-50"
                  >
                    {walletsLoading.has(agent.id) ? 'Creando...' : 'Crear wallet'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
