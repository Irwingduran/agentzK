import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { deductCredits, checkBalance } from '@/lib/credits';

type Action = 'bill_payment' | 'x402_payment' | 'test';

const SERVICE_LABELS: Record<string, string> = {
  cfe: 'Pago de CFE',
  telmex: 'Pago de Telmex',
  telcel: 'Pago de Telcel',
  izzi: 'Pago de Izzi',
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { action, service, amount, metadata } = body as {
    action: Action;
    service?: string;
    amount: number;
    metadata?: Record<string, unknown>;
  };

  if (!action || !amount || amount <= 0) {
    return Response.json({ error: 'acción y monto requeridos' }, { status: 400 });
  }

  const agent = await prisma.agent.findFirst({ where: { id, userId } });
  if (!agent) {
    return Response.json({ error: 'Agente no encontrado' }, { status: 404 });
  }

  // 1. Check spending rules
  const rules = await prisma.spendingRule.findMany({
    where: {
      userId,
      OR: [{ agentId: id }, { agentId: null }],
      enabled: true,
    },
  });

  const matchedService = service && SERVICE_LABELS[service] ? service : '*';
  const applicableRules = rules.filter(
    (r) => r.service === '*' || r.service === matchedService,
  );

  for (const rule of applicableRules) {
    if (amount > rule.maxAmount) {
      return Response.json({
        error: `Regla de gasto excedida`,
        reason: `El monto $${amount} excede el límite de $${rule.maxAmount} para ${rule.service}`,
        requiresConfirmation: rule.requiresConfirmation,
      }, { status: 403 });
    }
  }

  // 2. Check credits
  const { available } = await checkBalance(userId);
  if (available < amount) {
    return Response.json({
      error: 'Créditos insuficientes',
      reason: `Tienes ${available} créditos, necesitas ${amount}`,
    }, { status: 402 });
  }

  // 3. If action is 'test', don't actually deduct
  if (action === 'test') {
    return Response.json({
      success: true,
      message: '✅ Reglas y créditos OK. Simulación exitosa.',
      agent: agent.name,
      rulesChecked: applicableRules.length,
      creditsAvailable: available,
      creditsRequired: amount,
    });
  }

  // 4. Deduct credits (atomic)
  const description = service && SERVICE_LABELS[service]
    ? SERVICE_LABELS[service]
    : action === 'x402_payment'
      ? 'Pago x402'
      : 'Ejecución de agente';

  const deduction = await deductCredits(userId, amount, {
    agentId: id,
    description,
    type: action === 'x402_payment' ? 'x402_payment' : 'bill_payment',
    metadata: { ...metadata, service, action },
  });

  if (!deduction.success) {
    return Response.json({ error: deduction.error }, { status: 500 });
  }

  // 5. Try Stellar transaction if agent has a wallet with secret key
  let txHash: string | undefined;
  const agentWallet = await prisma.wallet.findFirst({ where: { agentId: id } });

  if (agentWallet?.encryptedJson) {
    try {
      const { Keypair, TransactionBuilder, BASE_FEE, Operation, Asset, Horizon } = await import('@stellar/stellar-sdk');
      const keypair = Keypair.fromSecret(agentWallet.encryptedJson);
      const horizon = new Horizon.Server(
        agent.networkId === 'stellar-testnet'
          ? 'https://horizon-testnet.stellar.org'
          : 'https://horizon.stellar.org'
      );
      const account = await horizon.loadAccount(keypair.publicKey());
      const passphrase = agent.networkId === 'stellar-testnet'
        ? 'Test SDF Network ; September 2015'
        : 'Public Global Stellar Network ; September 2015';

      const mxmAsset = new Asset('MXM', 'GC3CW7EDYRTWQ635VDIGY6S4ZUF5L6TQ7AA4MWS7LEQDBLUSZXV7UPS4');

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: passphrase,
      })
        .addOperation(Operation.payment({
          destination: keypair.publicKey(),
          asset: mxmAsset,
          amount: '0.0000001',
        }))
        .setTimeout(30)
        .build();

      tx.sign(keypair);
      const result = await horizon.submitTransaction(tx);
      txHash = result.hash;
    } catch (err) {
      console.warn('Stellar tx skipped:', err);
    }
  }

  // 6. Update transaction with tx result
  if (txHash) {
    await prisma.transaction.update({
      where: { id: deduction.transactionId },
      data: { txHash },
    });
  }

  return Response.json({
    success: true,
    transactionId: deduction.transactionId,
    txHash,
    walletConfigured: !!agentWallet?.encryptedJson,
    message: agentWallet?.encryptedJson
      ? '✅ Pago ejecutado'
      : '⚠️ Créditos deducidos. La ejecución on-chain requiere configurar clave secreta Stellar.',
  }, { status: 201 });
}
