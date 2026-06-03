import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const existing = await prisma.spendingRule.findUnique({
    where: { id: params.id },
  });

  if (!existing || existing.userId !== userId) {
    return Response.json({ error: 'No encontrado' }, { status: 404 });
  }

  const body = await req.json();
  const rule = await prisma.spendingRule.update({
    where: { id: params.id },
    data: {
      service: body.service ?? existing.service,
      maxAmount: body.maxAmount ?? existing.maxAmount,
      requiresConfirmation: body.requiresConfirmation ?? existing.requiresConfirmation,
      confirmationThreshold: body.confirmationThreshold ?? existing.confirmationThreshold,
      scheduleType: body.scheduleType ?? existing.scheduleType,
      scheduleDay: body.scheduleDay ?? existing.scheduleDay,
      scheduleTime: body.scheduleTime ?? existing.scheduleTime,
      enabled: body.enabled ?? existing.enabled,
    },
  });

  return Response.json(rule);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const existing = await prisma.spendingRule.findUnique({
    where: { id: params.id },
  });

  if (!existing || existing.userId !== userId) {
    return Response.json({ error: 'No encontrado' }, { status: 404 });
  }

  await prisma.spendingRule.delete({ where: { id: params.id } });
  return Response.json({ success: true });
}
