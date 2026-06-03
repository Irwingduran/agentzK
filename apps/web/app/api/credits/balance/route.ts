import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });

  if (!user) {
    return Response.json({ available: 0, reserved: 0, total: 0 });
  }

  const reserved = await prisma.transaction.count({
    where: { userId, status: 'pending' },
  });

  return Response.json({
    available: user.credits,
    reserved,
    total: user.credits + reserved,
  });
}
