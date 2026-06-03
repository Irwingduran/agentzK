import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; ruleId: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id, ruleId } = await params;

  const existing = await prisma.spendingRule.findUnique({ where: { id: ruleId } });
  if (!existing || existing.userId !== userId) {
    return Response.json({ error: 'No encontrado' }, { status: 404 });
  }

  const body = await req.json();
  const rule = await prisma.spendingRule.update({
    where: { id: ruleId },
    data: {
      service: body.service ?? existing.service,
      maxAmount: body.maxAmount ?? existing.maxAmount,
      requiresConfirmation: body.requiresConfirmation ?? existing.requiresConfirmation,
      confirmationThreshold: body.confirmationThreshold ?? existing.confirmationThreshold,
      enabled: body.enabled ?? existing.enabled,
    },
  });

  return Response.json(rule);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; ruleId: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id, ruleId } = await params;

  const existing = await prisma.spendingRule.findUnique({ where: { id: ruleId } });
  if (!existing || existing.userId !== userId) {
    return Response.json({ error: 'No encontrado' }, { status: 404 });
  }

  await prisma.spendingRule.delete({ where: { id: ruleId } });
  return Response.json({ success: true });
}
