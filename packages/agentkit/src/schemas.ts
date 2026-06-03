import { z } from 'zod';

export const PayBillSchema = z.object({
  service: z.enum(['cfe', 'telmex', 'telcel', 'izzi']),
  reference: z.string().min(1),
  amount: z.number().positive(),
});

export const PayX402Schema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST']).default('GET'),
  headers: z.record(z.string()).optional(),
  body: z.unknown().optional(),
});

export const GetBalanceSchema = z.object({});

export const GetHistorySchema = z.object({
  limit: z.number().int().positive().max(100).default(20),
});

export const AddRuleSchema = z.object({
  service: z.string(),
  maxAmount: z.number().positive(),
  requiresConfirmation: z.boolean().default(false),
  confirmationThreshold: z.number().optional(),
});

export const RemoveRuleSchema = z.object({
  ruleId: z.string(),
});


