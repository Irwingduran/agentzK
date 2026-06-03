export function CreditBalanceCard({ credits }: { credits: number }) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <p className="text-sm text-gray-500">Saldo disponible</p>
      <p className="mt-1 text-3xl font-bold">{credits.toLocaleString()} créditos</p>
      <p className="mt-1 text-xs text-gray-400">
        1 crédito ≈ $0.01 MXM
      </p>
    </div>
  );
}
