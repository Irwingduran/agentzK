import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;

  const rules = await prisma.spendingRule.findMany({
    where: {
      userId,
      OR: [{ agentId: id }, { agentId: null }],
    },
    orderBy: { createdAt: 'desc' },
  });

  return Response.json(rules);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { service, maxAmount, requiresConfirmation, confirmationThreshold } = body;

  if (!service || maxAmount == null) {
    return Response.json({ error: 'service y maxAmount son requeridos' }, { status: 400 });
  }

  const rule = await prisma.spendingRule.create({
    data: {
      userId,
      agentId: id,
      service,
      maxAmount,
      requiresConfirmation: requiresConfirmation ?? false,
      confirmationThreshold: confirmationThreshold ?? null,
    },
  });

  return Response.json(rule, { status: 201 });
}
