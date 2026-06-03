import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { deductCredits, checkBalance } from '@/lib/credits';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const { url, method, headers, body } = await req.json();

  if (!url) {
    return Response.json({ error: 'url es requerida' }, { status: 400 });
  }

  const agent = await prisma.agent.findFirst({ where: { id, userId } });
  if (!agent) {
    return Response.json({ error: 'Agente no encontrado' }, { status: 404 });
  }

  // x402: make the initial request to get the 402 response
  const initialRes = await fetch(url, {
    method: method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (initialRes.status !== 402) {
    return Response.json({
      success: initialRes.ok,
      cost: 0,
      data: initialRes.ok ? await initialRes.json().catch(() => null) : null,
      transactionId: crypto.randomUUID(),
    });
  }

  const paymentRequired = initialRes.headers.get('PAYMENT-REQUIRED');
  if (!paymentRequired) {
    return Response.json({ error: 'HTTP 402 sin PAYMENT-REQUIRED header' }, { status: 502 });
  }

  const paymentPayload = JSON.parse(
    Buffer.from(paymentRequired, 'base64').toString('utf-8')
  );

  const accept = paymentPayload.accepts?.[0];
  const amount = accept?.amount ? Math.ceil(Number(accept.amount) * 100) : 1;

  const { available } = await checkBalance(userId);
  if (available < amount) {
    return Response.json({ error: 'Créditos insuficientes para x402' }, { status: 402 });
  }

  const deduction = await deductCredits(userId, amount, {
    agentId: id,
    description: `x402: ${url}`,
    type: 'x402_payment',
    metadata: { url, method, paymentPayload },
  });

  if (!deduction.success) {
    return Response.json({ error: deduction.error }, { status: 500 });
  }

  const signaturePayload = {
    x402Version: 2,
    accepted: accept,
    payload: {
      signature: deduction.transactionId.replace(/-/g, ''),
      authorization: {
        from: agent.walletAddress ?? 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWF',
        to: accept.payTo,
        value: accept.amount,
        validAfter: Math.floor(Date.now() / 1000).toString(),
        validBefore: (Math.floor(Date.now() / 1000) + 60).toString(),
        nonce: crypto.randomUUID().replace(/-/g, ''),
      },
    },
  };

  const retryRes = await fetch(url, {
    method: method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      'PAYMENT-SIGNATURE': Buffer.from(JSON.stringify(signaturePayload)).toString('base64'),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = retryRes.ok ? await retryRes.json().catch(() => null) : null;

  return Response.json({
    success: retryRes.ok,
    cost: amount,
    data,
    transactionId: deduction.transactionId,
  }, { status: retryRes.ok ? 200 : 502 });
}
