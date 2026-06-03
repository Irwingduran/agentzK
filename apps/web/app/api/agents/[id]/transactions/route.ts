import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);

  const transactions = await prisma.transaction.findMany({
    where: { userId, agentId: id },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return Response.json(transactions);
}
