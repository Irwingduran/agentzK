export type TransactionType =
  | 'credit_purchase'
  | 'credit_deduction'
  | 'x402_payment'
  | 'bill_payment'
  | 'investment';

export type TransactionStatus =
  | 'pending'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type TransactionCurrency = 'credits' | 'MXM' | 'MXN';

export interface Transaction {
  id: string;
  userId: string;
  agentId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: TransactionCurrency;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
}
