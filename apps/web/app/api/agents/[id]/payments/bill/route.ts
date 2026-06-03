import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { deductCredits, checkBalance } from '@/lib/credits';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const { service, reference, amount } = await req.json();

  if (!service || !reference || !amount) {
    return Response.json({ error: 'service, reference y amount requeridos' }, { status: 400 });
  }

  const agent = await prisma.agent.findFirst({ where: { id, userId } });
  if (!agent) {
    return Response.json({ error: 'Agente no encontrado' }, { status: 404 });
  }

  const { available } = await checkBalance(userId);
  if (available < amount) {
    return Response.json({ error: 'Créditos insuficientes' }, { status: 402 });
  }

  const deduction = await deductCredits(userId, amount, {
    agentId: id,
    description: `Pago de ${service.toUpperCase()} ref ${reference}`,
    type: 'bill_payment',
    metadata: { service, reference },
  });

  if (!deduction.success) {
    return Response.json({ error: deduction.error }, { status: 500 });
  }

  return Response.json({
    success: true,
    transactionId: deduction.transactionId,
    service,
    amount,
    fee: Math.round(amount * 0.015),
    confirmationCode: `open402_${deduction.transactionId.slice(0, 12)}`,
  }, { status: 201 });
}
