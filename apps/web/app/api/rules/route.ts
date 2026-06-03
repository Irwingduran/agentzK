import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const rules = await prisma.spendingRule.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return Response.json(rules);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await req.json();
  const { service, maxAmount, requiresConfirmation, confirmationThreshold, scheduleType, scheduleDay, scheduleTime, agentId } = body;

  if (!service || maxAmount == null) {
    return Response.json({ error: 'service y maxAmount son requeridos' }, { status: 400 });
  }

  const rule = await prisma.spendingRule.create({
    data: {
      userId,
      agentId: agentId ?? null,
      service,
      maxAmount,
      requiresConfirmation: requiresConfirmation ?? false,
      confirmationThreshold: confirmationThreshold ?? null,
      scheduleType: scheduleType ?? null,
      scheduleDay: scheduleDay ?? null,
      scheduleTime: scheduleTime ?? null,
    },
  });

  return Response.json(rule, { status: 201 });
}
