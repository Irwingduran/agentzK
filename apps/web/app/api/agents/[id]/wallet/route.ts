import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { Keypair } from '@stellar/stellar-sdk';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  if (agent.wallet) {
    return Response.json({ address: agent.wallet.address }, { status: 200 });
  }

  const stellarSecretKey = process.env.STELLAR_WALLET_SECRET_KEY;

  let address: string;
  let encryptedJson: string | undefined;

  if (stellarSecretKey) {
    // Use a derived keypair from the base secret + agent id
    const { createHash } = await import('node:crypto');
    const seed = createHash('sha256').update(`stellar:${stellarSecretKey}:${id}`).digest();
    const keypair = Keypair.fromRawEd25519Seed(seed.subarray(0, 32));
    address = keypair.publicKey();
    encryptedJson = keypair.secret();
  } else {
    // Mock wallet: deterministic Stellar address based on agent id
    const { createHash } = await import('node:crypto');
    const seed = createHash('sha256').update(`stellar:mock:${id}`).digest();
    const keypair = Keypair.fromRawEd25519Seed(seed.subarray(0, 32));
    address = keypair.publicKey();
    encryptedJson = keypair.secret();
  }

  const wallet = await prisma.wallet.create({
    data: {
      userId,
      agentId: id,
      address,
      networkId: agent.networkId,
      walletType: stellarSecretKey ? 'agentic' : 'mock',
      encryptedJson,
    },
  });

  await prisma.agent.update({
    where: { id },
    data: { walletAddress: address },
  });

  return Response.json({ address: wallet.address }, { status: 201 });
}
