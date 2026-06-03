'use client';

import { useState } from 'react';

type Rule = {
  id: string;
  service: string;
  maxAmount: number;
  requiresConfirmation: boolean;
  confirmationThreshold: number | null;
  scheduleType: string | null;
  scheduleDay: number | null;
  scheduleTime: string | null;
  enabled: boolean;
};

const SERVICES = [
  { value: 'cfe', label: 'CFE (Luz)' },
  { value: 'telmex', label: 'Telmex (Internet)' },
  { value: 'telcel', label: 'Telcel (Celular)' },
  { value: 'izzi', label: 'Izzi (TV+Internet)' },
  { value: '*', label: 'Cualquier servicio' },
];

const SCHEDULE_TYPES = [
  { value: '', label: 'Sin programación' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'one-time', label: 'Una vez' },
];

const defaults: Rule = {
  id: '',
  service: 'cfe',
  maxAmount: 500,
  requiresConfirmation: true,
  confirmationThreshold: 300,
  scheduleType: '',
  scheduleDay: null,
  scheduleTime: null,
  enabled: true,
};

export function RulesManager({ initialRules }: { initialRules: Rule[] }) {
  const [rules, setRules] = useState<Rule[]>(initialRules);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function save(data: Partial<Rule>) {
    if (editing) {
      const res = await fetch(`/api/rules/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } else {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) return;
      const created = await res.json();
      setRules((prev) => [created, ...prev]);
    }
    setEditing(null);
    setShowForm(false);
  }

  async function remove(id: string) {
    const res = await fetch(`/api/rules/${id}`, { method: 'DELETE' });
    if (!res.ok) return;
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  async function toggleEnabled(rule: Rule) {
    const res = await fetch(`/api/rules/${rule.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !rule.enabled }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  function startEdit(rule: Rule) {
    setEditing(rule);
    setShowForm(true);
  }

  const serviceLabel = (v: string) => SERVICES.find((s) => s.value === v)?.label ?? v;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <p className="text-sm text-slate-500">
          Define qué puede gastar tu agente, cuánto y cuándo. Las reglas son bloqueantes.
        </p>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="text-xs font-mono font-bold px-4 py-2 rounded-lg bg-slate-900 text-white border-none cursor-pointer hover:bg-slate-800 transition-colors"
        >
          + Nueva regla
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <RuleForm
          initial={editing ?? defaults}
          onSave={save}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {/* List */}
      {rules.length === 0 && !showForm && (
        <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <p className="text-sm text-slate-400 font-mono">No hay reglas de gasto todavía</p>
          <p className="text-xs text-slate-300 mt-1">Crea una regla para empezar a controlar los gastos de tu agente</p>
        </div>
      )}

      <div className="space-y-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`rounded-xl border bg-white p-5 transition-opacity ${rule.enabled ? 'border-black/10' : 'border-black/5 opacity-50'}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${rule.enabled ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-400'}`}>
                    {serviceLabel(rule.service)}
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    ${rule.maxAmount.toLocaleString()} MXN
                  </span>
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
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleEnabled(rule)}
                  className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
                    rule.enabled
                      ? 'border-green-200 text-green-600 bg-green-50 hover:bg-green-100'
                      : 'border-slate-200 text-slate-400 bg-white hover:bg-slate-50'
                  }`}
                >
                  {rule.enabled ? 'Activa' : 'Inactiva'}
                </button>
                <button onClick={() => startEdit(rule)} className="text-[10px] font-mono text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-none">
                  Editar
                </button>
                <button onClick={() => remove(rule.id)} className="text-[10px] font-mono text-red-300 hover:text-red-500 cursor-pointer bg-transparent border-none">
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RuleForm({
  initial, onSave, onCancel,
}: {
  initial: Rule;
  onSave: (data: Partial<Rule>) => Promise<void>;
  onCancel: () => void;
}) {
  const [data, setData] = useState(initial);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-black/10 bg-slate-50 p-5 mb-6 space-y-4">
      <p className="text-xs font-mono font-bold text-amber-600">{initial.id ? 'Editar regla' : 'Nueva regla'}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-mono text-slate-500 block mb-1">Servicio</label>
          <select
            value={data.service}
            onChange={(e) => setData({ ...data, service: e.target.value })}
            className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-black/10 bg-white text-slate-700"
          >
            {SERVICES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-mono text-slate-500 block mb-1">Monto máximo (MXN)</label>
          <input
            type="number"
            value={data.maxAmount}
            onChange={(e) => setData({ ...data, maxAmount: Number(e.target.value) })}
            className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-black/10 bg-white text-slate-700"
            min={1}
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="reqConfirm"
            checked={data.requiresConfirmation}
            onChange={(e) => setData({ ...data, requiresConfirmation: e.target.checked })}
            className="rounded border-slate-300"
          />
          <label htmlFor="reqConfirm" className="text-[10px] font-mono text-slate-500">Requiere confirmación</label>
        </div>
        {data.requiresConfirmation && (
          <div>
            <label className="text-[10px] font-mono text-slate-500 block mb-1">Confirmar si supera (MXN)</label>
            <input
              type="number"
              value={data.confirmationThreshold ?? ''}
              onChange={(e) => setData({ ...data, confirmationThreshold: Number(e.target.value) || null })}
              className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-black/10 bg-white text-slate-700"
              min={1}
            />
          </div>
        )}
        <div>
          <label className="text-[10px] font-mono text-slate-500 block mb-1">Programación</label>
          <select
            value={data.scheduleType ?? ''}
            onChange={(e) => setData({ ...data, scheduleType: e.target.value || null })}
            className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-black/10 bg-white text-slate-700"
          >
            {SCHEDULE_TYPES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        {data.scheduleType === 'monthly' && (
          <div>
            <label className="text-[10px] font-mono text-slate-500 block mb-1">Día del mes</label>
            <input
              type="number"
              value={data.scheduleDay ?? ''}
              onChange={(e) => setData({ ...data, scheduleDay: Number(e.target.value) || null })}
              className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-black/10 bg-white text-slate-700"
              min={1}
              max={31}
            />
          </div>
        )}
        {data.scheduleType && (
          <div>
            <label className="text-[10px] font-mono text-slate-500 block mb-1">Hora</label>
            <input
              type="time"
              value={data.scheduleTime ?? ''}
              onChange={(e) => setData({ ...data, scheduleTime: e.target.value || null })}
              className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-black/10 bg-white text-slate-700"
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" className="text-xs font-mono font-bold px-4 py-2 rounded-lg bg-slate-900 text-white border-none cursor-pointer hover:bg-slate-800 transition-colors">
          {initial.id ? 'Guardar cambios' : 'Crear regla'}
        </button>
        <button type="button" onClick={onCancel} className="text-xs font-mono text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-none">
          Cancelar
        </button>
      </div>
    </form>
  );
}
