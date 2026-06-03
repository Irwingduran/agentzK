import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const agents = await prisma.agent.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return Response.json(agents);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { name } = await req.json();
  if (!name || typeof name !== 'string') {
    return Response.json({ error: 'Nombre requerido' }, { status: 400 });
  }

  const agent = await prisma.agent.create({
    data: { userId, name },
  });

  return Response.json(agent, { status: 201 });
}
