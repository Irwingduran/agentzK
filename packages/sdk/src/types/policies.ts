export interface RecurringSchedule {
  type: 'monthly' | 'weekly' | 'daily';
  day?: number;
  time: string;
}

export interface SpendingRule {
  id: string;
  service: string;
  maxAmount: number;
  requiresConfirmation: boolean;
  confirmationThreshold?: number;
  schedule?: RecurringSchedule;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSpendingRuleInput {
  service: string;
  maxAmount: number;
  requiresConfirmation?: boolean;
  confirmationThreshold?: number;
  schedule?: RecurringSchedule;
  enabled?: boolean;
}

export type PolicyDecision =
  | { allowed: true }
  | { allowed: false; reason: string; requiresConfirmation?: boolean };
