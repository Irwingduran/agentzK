import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;

  const agent = await prisma.agent.findFirst({
    where: { id, userId },
    include: { wallet: true },
  });

  if (!agent) {
    return Response.json({ error: 'Agente no encontrado' }, { status: 404 });
  }

  return Response.json({
    id: agent.id,
    name: agent.name,
    address: agent.wallet?.address ?? agent.walletAddress ?? 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWF',
    balance: 0,
    networkId: agent.networkId,
    createdAt: agent.createdAt,
  });
}
