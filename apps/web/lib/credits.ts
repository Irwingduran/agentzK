import { prisma } from './prisma';
import type { Prisma } from '@prisma/client';

export type CreditResult = { success: true; transactionId: string } | { success: false; error: string };

export async function checkBalance(userId: string): Promise<{ available: number; reserved: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  return { available: user?.credits ?? 0, reserved: 0 };
}

export async function deductCredits(
  userId: string,
  amount: number,
  opts: {
    agentId?: string;
    description: string;
    type?: 'credit_deduction' | 'bill_payment' | 'x402_payment';
    metadata?: Record<string, unknown>;
  },
): Promise<CreditResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('Usuario no encontrado');
      if (user.credits < amount) {
        throw new Error(`Créditos insuficientes: tienes ${user.credits}, necesitas ${amount}`);
      }

      const record = await tx.transaction.create({
        data: {
          userId,
          agentId: opts.agentId,
          type: opts.type ?? 'credit_deduction',
          status: 'completed',
          amount,
          currency: 'credits',
          description: opts.description,
          metadata: (opts.metadata ?? {}) as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { credits: { decrement: amount } },
      });

      return record;
    });

    return { success: true, transactionId: result.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' };
  }
}
