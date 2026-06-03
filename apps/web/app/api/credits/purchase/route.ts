import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { createMxnbDepositInstructions, isBitsoConfigured } from '@/lib/bitso';

const EXCHANGE_RATE = 100;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { amountMXN } = await req.json();

  if (amountMXN < 50 || amountMXN > 10000) {
    return Response.json({ error: 'Monto debe estar entre 50 y 10,000 MXN' }, { status: 400 });
  }

  const creditsAmount = Math.floor(amountMXN * EXCHANGE_RATE);

  try {
    if (!isBitsoConfigured()) {
      const transaction = await prisma.transaction.create({
        data: {
          userId,
          type: 'credit_purchase',
          status: 'completed',
          amount: creditsAmount,
          currency: 'credits',
          description: `Compra de ${creditsAmount} créditos por $${amountMXN} MXN — modo prueba`,
          metadata: { amountMXN, exchangeRate: EXCHANGE_RATE, mock: true },
        },
      });

      await prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: creditsAmount } },
      });

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'completed', completedAt: new Date() },
      });

      return Response.json({
        success: true,
        creditsAmount,
        exchangeRate: EXCHANGE_RATE,
        transactionId: transaction.id,
        mock: true,
      });
    }

    const instructions = await createMxnbDepositInstructions(amountMXN);

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: 'credit_purchase',
        status: 'pending',
        amount: creditsAmount,
        currency: 'credits',
        description: `Compra de ${creditsAmount} créditos por $${amountMXN} MXN vía SPEI (MXNB)`,
        metadata: {
          amountMXN,
          exchangeRate: EXCHANGE_RATE,
          bitsoDepositId: instructions.deposit_id,
          speiClabe: instructions.clabe,
          speiReference: instructions.reference,
        },
      },
    });

    return Response.json({
      success: true,
      transactionId: transaction.id,
      speiClabe: instructions.clabe,
      speiReference: instructions.reference,
      speiAmount: amountMXN,
      speiConcept: instructions.concept,
      speiExpiresAt: instructions.expires_at,
      exchangeRate: EXCHANGE_RATE,
      creditsAmount,
    });
  } catch (err) {
    return Response.json({ success: false, error: 'Error al procesar la compra' }, { status: 500 });
  }
}
