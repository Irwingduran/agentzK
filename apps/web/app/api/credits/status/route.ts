import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { checkMxnbDepositStatus } from '@/lib/bitso';

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const txId = searchParams.get('transactionId');
  if (!txId) {
    return Response.json({ error: 'transactionId requerido' }, { status: 400 });
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id: txId },
  });

  if (!transaction || transaction.userId !== userId) {
    return Response.json({ error: 'Transacción no encontrada' }, { status: 404 });
  }

  if (transaction.status !== 'pending') {
    return Response.json({
      status: transaction.status,
      creditsAmount: transaction.amount,
      completedAt: transaction.completedAt,
      transactionId: transaction.id,
    });
  }

  const metadata = transaction.metadata as Record<string, unknown> | null;
  const depositId = metadata?.bitsoDepositId as string | undefined;

  if (!depositId) {
    return Response.json({ status: 'pending' });
  }

  try {
    const deposit = await checkMxnbDepositStatus(depositId);

    if (deposit.status === 'confirmed') {
      const creditsAmount = transaction.amount;

      await prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: creditsAmount } },
      });

      await prisma.transaction.update({
        where: { id: txId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          metadata: {
            ...metadata,
            bitsoConfirmedAmount: deposit.confirmed_amount,
            bitsoConfirmedAt: deposit.confirmed_at,
          },
        },
      });

      return Response.json({
        status: 'completed',
        creditsAmount,
        completedAt: new Date().toISOString(),
        transactionId: txId,
      });
    }

    if (deposit.status === 'failed' || deposit.status === 'expired') {
      await prisma.transaction.update({
        where: { id: txId },
        data: {
          status: 'failed',
          failedAt: new Date(),
          errorMessage: `Depósito ${deposit.status}`,
        },
      });

      return Response.json({ status: 'failed', error: `El depósito ${deposit.status}` });
    }

    return Response.json({ status: 'pending' });
  } catch {
    return Response.json({ status: 'pending' });
  }
}
