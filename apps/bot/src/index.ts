import { Bot, webhookCallback } from 'grammy';
import { createServer } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import OpenAI from 'openai';
import { prisma } from '@open402/db';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');

const openaiKey = process.env.OPENAI_API_KEY;
if (!openaiKey) throw new Error('OPENAI_API_KEY is required');

const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
const webappUrl = process.env.WEBAPP_URL ?? 'http://localhost:3000';
const isDev = process.env.NODE_ENV === 'development' || !webhookUrl;

const openai = new OpenAI({ apiKey: openaiKey });
const bot = new Bot(token);

bot.catch((err) => {
  console.error('Bot error:', err.message);
});

bot.api.setMyCommands([
  { command: 'start', description: 'Iniciar el bot' },
]);

// ─── Tools ──────────────────────────────────────────────────────────────────────

const TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_balance',
      description: 'Obtener el saldo de créditos del usuario',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_agents',
      description: 'Listar los agentes del usuario',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_agent_detail',
      description: 'Obtener detalle de un agente: reglas, wallet, últimas transacciones',
      parameters: { type: 'object', properties: { name: { type: 'string', description: 'Nombre del agente' } }, required: ['name'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_agent',
      description: 'Crear un nuevo agente para el usuario',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nombre del agente' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_rule',
      description: 'Crear una regla de gasto',
      parameters: {
        type: 'object',
        properties: {
          service: { type: 'string', enum: ['cfe', 'telmex', 'telcel', 'izzi'], description: 'Servicio' },
          maxAmount: { type: 'number', description: 'Monto máximo en MXN' },
          agentName: { type: 'string', description: 'Nombre del agente (opcional)' },
          requiresConfirmation: { type: 'boolean', description: 'Si requiere confirmación manual' },
          confirmationThreshold: { type: 'number', description: 'Monto desde el cual requiere confirmación' },
        },
        required: ['service', 'maxAmount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_transactions',
      description: 'Obtener las últimas transacciones del usuario',
      parameters: { type: 'object', properties: { limit: { type: 'number', description: 'Cantidad (max 10)' } }, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'execute_payment',
      description: 'Ejecutar un pago. Valida reglas, deduce créditos y registra la transacción.',
      parameters: {
        type: 'object',
        properties: {
          agentName: { type: 'string', description: 'Nombre del agente' },
          service: { type: 'string', enum: ['cfe', 'telmex', 'telcel', 'izzi'], description: 'Servicio' },
          reference: { type: 'string', description: 'Referencia o contrato' },
          amount: { type: 'number', description: 'Monto en MXN' },
        },
        required: ['agentName', 'service', 'reference', 'amount'],
      },
    },
  },
];

// ─── DB operations ──────────────────────────────────────────────────────────────

async function deterministicMockAddress(seed: string): Promise<string> {
  const hash = createHash('sha256').update(seed).digest();
  const { Keypair } = await import('@stellar/stellar-sdk');
  return Keypair.fromRawEd25519Seed(hash.subarray(0, 32)).publicKey();
}

async function createAgent(userId: string, name: string): Promise<string> {
  const network = 'stellar-testnet';
  const existing = await prisma.agent.findFirst({
    where: { userId, name: { equals: name, mode: 'insensitive' } },
  });
  if (existing) return `Ya tienes un agente "${name}".`;

  const agent = await prisma.agent.create({
    data: { userId, name, networkId: network },
  });

  const addr = await deterministicMockAddress(`mock:${agent.id}`);
  await prisma.wallet.create({
    data: { userId, agentId: agent.id, address: addr, networkId: network, walletType: 'mock' },
  });
  await prisma.agent.update({ where: { id: agent.id }, data: { walletAddress: addr } });

  return `✅ *${name}* creado con wallet \`${addr.slice(0, 8)}…${addr.slice(-6)}\` en ${network}.`;
}

async function createRule(
  userId: string, service: string, maxAmount: number,
  agentName?: string, requiresConfirmation?: boolean, confirmationThreshold?: number,
): Promise<string> {
  let agentId: string | null = null;
  if (agentName) {
    const agent = await prisma.agent.findFirst({ where: { userId, name: { contains: agentName, mode: 'insensitive' } } });
    if (!agent) return `No encontré un agente "${agentName}".`;
    agentId = agent.id;
  }

  await prisma.spendingRule.create({
    data: { userId, agentId, service, maxAmount, enabled: true, requiresConfirmation: requiresConfirmation ?? false, confirmationThreshold: confirmationThreshold ?? null },
  });

  let msg = `✅ Regla: ${service.toUpperCase()} — máximo $${maxAmount} MXN`;
  if (agentName) msg += ` (${agentName})`;
  if (requiresConfirmation) msg += `, confirmación desde $${confirmationThreshold ?? maxAmount} MXN`;
  return msg;
}

async function deductAndRecord(userId: string, agentId: string, service: string, reference: string, amount: number, previousCredits: number): Promise<string> {
  try {
    await prisma.$transaction(async (tx) => {
      const u = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (u.credits < amount) throw new Error('Saldo insuficiente');
      await tx.user.update({ where: { id: userId }, data: { credits: { decrement: amount } } });
      await tx.transaction.create({
        data: {
          userId, agentId, type: 'bill_payment', amount: -amount, currency: 'credits',
          description: `Pago ${service.toUpperCase()} - ref: ${reference}`, status: 'completed', metadata: { service, reference },
        },
      });
    });
    return `✅ *Pago exitoso*\n\n${service.toUpperCase()} — $${amount} MXN\nRef: ${reference}\nSaldo: ${(previousCredits - amount).toLocaleString()} créditos`;
  } catch (e) {
    return `❌ ${e instanceof Error ? e.message : 'Error'}`;
  }
}

// ─── State machine ──────────────────────────────────────────────────────────────

type OnboardingState = 'no_account' | 'has_account_no_agents' | 'has_agents_no_rules' | 'ready';

interface PendingConfirm {
  userId: string; agentId: string; service: string; reference: string; amount: number; previousCredits: number;
}
const pendingConfirmations = new Map<string, PendingConfirm>();

type UserWithAgents = Awaited<ReturnType<typeof prisma.user.findUnique>> & { agents: any[] };

async function getUserState(telegramId: string): Promise<{ user: NonNullable<UserWithAgents>; state: OnboardingState } | null> {
  const user = await prisma.user.findUnique({
    where: { telegramId },
    include: { agents: true },
  });
  if (!user) return null;
  if (user.agents.length === 0) return { user: user as any, state: 'has_account_no_agents' };
  const rulesCount = await prisma.spendingRule.count({ where: { userId: user.id } });
  if (rulesCount === 0) return { user: user as any, state: 'has_agents_no_rules' };
  return { user: user as any, state: 'ready' };
}

async function sendOnboarding(ctx: any, state: OnboardingState, name: string) {
  if (state === 'has_account_no_agents') {
    await ctx.reply(
      `¡Bienvenido, ${name}! 👋\n\n` +
      `Soy tu agente financiero. Esto es lo que necesitas para empezar:\n\n` +
      `*Paso 1:* Crear un agente\n` +
      `Un agente es como tu asistente de pagos. Tiene su propia wallet y reglas.\n` +
      `➡️ *Dime un nombre para tu agente* (ej: "Mi Agente" o "Pagos CFE") y lo creo.\n\n` +
      `*Después podremos:*\n` +
      `• Configurar reglas de gasto (límites por servicio)\n` +
      `• Pagar recibos de CFE, Telmex, Telcel\n` +
      `• Comprar créditos\n\n` +
      `¿Qué nombre quieres ponerle a tu primer agente?`,
      { parse_mode: 'Markdown' }
    );
    return true;
  }

  if (state === 'has_agents_no_rules') {
    await ctx.reply(
      `¡Bienvenido de nuevo, ${name}! 👋\n\n` +
      `Ya tienes agente(s) pero *sin reglas de gasto*. Las reglas le dicen a tu agente cuánto puede gastar y en qué.\n\n` +
      `*Paso sugerido:* Crear una regla\n` +
      `➡️ Dime algo como: *"crea una regla para CFE de \$500"* o *"permite pagos Telmex hasta \$300"*\n\n` +
      `También puedes enviarme la *foto de un recibo* y me encargo de todo.`,
      { parse_mode: 'Markdown' }
    );
    return true;
  }

  if (state === 'ready') {
    await ctx.reply(
      `¡Bienvenido de nuevo, ${name}! 👋\n\n` +
      `Todo está listo. Puedes:\n\n` +
      `• *Enviarme la foto de un recibo* y lo proceso\n` +
      `• *"Paga CFE ref 123456 por \$350"*\n` +
      `• *"Invierte \$500 en CETES"*\n` +
      `• *"Cómo va mi inversión"*\n` +
      `• *"Crea un agente"*\n` +
      `• *"Crea una regla"*\n` +
      `• Consultar tu *saldo* o *transacciones*\n\n` +
      `¿Qué necesitas?`,
      { parse_mode: 'Markdown' }
    );
    return true;
  }

  return false;
}

// ─── Text handler ───────────────────────────────────────────────────────────────

bot.on('message:text', async (ctx) => {
  if (!ctx.from) return;
  const telegramId = String(ctx.from.id);
  const userName = ctx.from.first_name ?? 'Usuario';
  const text = ctx.message.text;

  const state = await getUserState(telegramId);
  if (!state) {
    await ctx.reply(`Hola ${userName}! 👋 Usa /start para vincular tu cuenta.`);
    return;
  }

  // Confirmation responses (only when there IS a pending payment)
  const pending = pendingConfirmations.get(telegramId);
  if (pending) {
    if (/^(sí|si|confirmo|adelante|dale|ok|s|simon)/i.test(text.trim())) {
      pendingConfirmations.delete(telegramId);
      const r = await deductAndRecord(pending.userId, pending.agentId, pending.service, pending.reference, pending.amount, pending.previousCredits);
      await ctx.reply(r, { parse_mode: 'Markdown' });
      return;
    }
    if (/^(no|cancela|para|detente)/i.test(text.trim())) {
      pendingConfirmations.delete(telegramId);
      await ctx.reply('✅ Cancelado.');
      return;
    }
  }

  // Onboarding trigger: /start or first message after state change
  if (text === '/start' || text === 'hola' || text === 'Hola' || text === 'hello') {
    const sent = await sendOnboarding(ctx, state.state, userName);
    if (sent) return;
  }

  // Build context for GPT
  let context = '';
  if (state.state === 'has_account_no_agents') context = '\n\nCONTEXTO: El usuario NO tiene agentes. Si pide crear un agente, usa create_agent. Si pregunta algo que requiera un agente, recuérdale que primero necesita uno.';
  else if (state.state === 'has_agents_no_rules') context = '\n\nCONTEXTO: El usuario tiene agente(s) pero NO tiene reglas de gasto. Sugiérele crear una con create_rule.';

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content:
        `Eres el agente financiero de open402 en Telegram. Eres proactivo, directo y resuelves.` +
        `\nUsuario: ${userName} (Telegram: ${telegramId})` +
        `\nWebapp: ${webappUrl}` +
        `\n\nREGLAS:` +
        `\n- Responde en español, sin rodeos. Usa Markdown (*negritas*, \\\`código\\\`).` +
        `\n- *Solo pide confirmación para pagos* (execute_payment). Para todo lo demás (crear agente, crear regla), hazlo sin preguntar de más.` +
        `\n- Si el usuario dice "crea un agente para pagar X", usa "X" como nombre sugerido o pregunta solo el nombre una vez.` +
        `\n- Cuando el usuario te dé un nombre, créalo inmediatamente con create_agent. No preguntes "confirmas?".` +
        `\n- Cuando el usuario te dé servicio + monto, crea la regla inmediatamente con create_rule.` +
        `\n- Si el usuario confirma un pago (sí, ok, dale), ejecuta execute_payment con los datos acordados.` +
        `\n- NO inventes montos ni referencias. Pregunta si no los sabes.` +
        `\n- *Después de crear un agente*, dile algo como: "Listo. ¿Quieres crear una regla de gasto? Por ejemplo: *crea una regla para CFE de \$500*".` +
      `\n- *Después de crear una regla*, dile: "Perfecto. Ahora puedes enviarme la foto de un recibo o decirme *paga [servicio] ref [número] por \$[monto]*".` +
      `\n- Cuando el usuario diga algo como "CFE 3000", "sube la regla a 5000", "cambia CFE a 4000", SIEMPRE llama a create_rule con servicio= "cfe" (minúsculas) y maxAmount= 3000. NO respondas solo con texto, ejecuta la función. No estás seguro de si la regla existía o no, créala de todos modos.` +
      `\n- NO preguntes "qué sigue?" o "qué más?". Siempre da una opción concreta.` +
        context,
    },
    { role: 'user', content: text },
  ];

  let replyText = '';

  for (let i = 0; i < 5; i++) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
    });

    const msg = response.choices[0]?.message;
    if (!msg) break;
    messages.push(msg);

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      const toolCalls = msg.tool_calls.filter(
        (tc): tc is OpenAI.ChatCompletionMessageFunctionToolCall => 'function' in tc
      );
      const results = await Promise.all(
        toolCalls.map(async (tc) => {
          let args: Record<string, unknown> = {};
          try { args = JSON.parse(tc.function.arguments); } catch {}
          const output = await executeTool(tc.function.name, args, state!.user);
          return { tool_call_id: tc.id, output };
        })
      );
      for (const r of results) {
        messages.push({ role: 'tool', tool_call_id: r.tool_call_id, content: r.output });
      }
    } else {
      replyText = msg.content ?? '';
      break;
    }
  }

  if (!replyText) replyText = 'Disculpa, no pude procesar eso. Intenta de nuevo.';

  try {
    await ctx.reply(replyText, { parse_mode: 'Markdown' });
  } catch {
    await ctx.reply(replyText);
  }
});

// ─── Tool executor ──────────────────────────────────────────────────────────────

async function executeTool(name: string, args: Record<string, unknown>, user: any): Promise<string> {
  switch (name) {
    case 'get_balance':
      return `💰 *${user.credits.toLocaleString()} créditos* disponibles.`;

    case 'list_agents': {
      if (user.agents.length === 0) return 'No tienes agentes. Dime un nombre y lo creo.';
      return user.agents.map((a: any, i: number) =>
        `${i + 1}. *${a.name}*${a.walletAddress ? ' (\`' + a.walletAddress.slice(0, 6) + '…\`)' : ''}`
      ).join('\n');
    }

    case 'get_agent_detail': {
      const agents = user.agents.filter((a: any) => a.name.toLowerCase().includes(String(args.name ?? '').toLowerCase()));
      if (agents.length === 0) return `No encontré "${args.name}".`;
      if (agents.length > 1) return `Varios: ${agents.map((a: any) => a.name).join(', ')}. Sé más específico.`;
      const agent = agents[0];
      const [rules, txs, wallet] = await Promise.all([
        prisma.spendingRule.findMany({ where: { userId: user.id, OR: [{ agentId: agent.id }, { agentId: null }] } }),
        prisma.transaction.findMany({ where: { agentId: agent.id }, orderBy: { createdAt: 'desc' }, take: 5 }),
        prisma.wallet.findFirst({ where: { agentId: agent.id } }),
      ]);
      let m = `📋 *${agent.name}*\n`;
      if (wallet) m += `Wallet: \`${wallet.address}\` (${wallet.networkId})\n`;
      m += `\n*Reglas:*\n${rules.length === 0 ? 'Sin reglas\n' : rules.map((r: any) => `• ${r.service.toUpperCase()}: \$${r.maxAmount} MXN${r.requiresConfirmation ? ' (confirma)' : ''}`).join('\n')}`;
      m += `\n\n*Transacciones:*\n${txs.length === 0 ? 'Sin tx\n' : txs.map((tx: any) => `• ${tx.description}: \$${tx.amount} ${tx.currency} — ${tx.status}`).join('\n')}`;
      return m;
    }

    case 'create_agent':
      return await createAgent(user.id, String(args.name ?? ''));

    case 'create_rule':
      return await createRule(
        user.id, String(args.service ?? ''), Number(args.maxAmount) || 0,
        args.agentName ? String(args.agentName) : undefined,
        args.requiresConfirmation === true,
        args.confirmationThreshold ? Number(args.confirmationThreshold) : undefined,
      );

    case 'get_transactions': {
      const limit = Math.min(10, Number(args.limit) || 5);
      const txs = await prisma.transaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: limit });
      if (txs.length === 0) return 'No hay transacciones.';
      return txs.map(tx => `• ${tx.description}: \$${tx.amount} ${tx.currency} — ${tx.status}`).join('\n');
    }

    case 'execute_payment': {
      const agentName = String(args.agentName ?? '');
      const service = String(args.service ?? '');
      const reference = String(args.reference ?? '');
      const amount = Number(args.amount) || 0;

      const agent = await prisma.agent.findFirst({ where: { userId: user.id, name: { contains: agentName, mode: 'insensitive' } } });
      if (!agent) return `No encontré un agente "${agentName}".`;

      if (user.credits < amount) return `Saldo insuficiente. Tienes ${user.credits.toLocaleString()}, necesitas ${amount}.`;

      const rules = await prisma.spendingRule.findMany({
        where: { userId: user.id, enabled: true, service, OR: [{ agentId: agent.id }, { agentId: null }] },
      });
      if (rules.length === 0) return `No hay reglas para ${service.toUpperCase()}. ¿Quieres crear una?`;

      const maxAllowed = Math.max(...rules.map((r: any) => r.maxAmount));
      if (amount > maxAllowed) return `El monto (\$${amount}) excede el máximo (\$${maxAllowed}).`;

      const confirmRule = rules.find((r: any) => r.requiresConfirmation && amount >= (r.confirmationThreshold ?? Infinity));
      if (confirmRule) {
        pendingConfirmations.set(user.telegramId, { userId: user.id, agentId: agent.id, service, reference, amount, previousCredits: user.credits });
        return `⚠️ Requiere confirmación.\n\nPago: ${service.toUpperCase()} — \$${amount} MXN\nRef: ${reference}\n\nResponde *"Sí"* para autorizar.`;
      }

      return await deductAndRecord(user.id, agent.id, service, reference, amount, user.credits);
    }

    default:
      return 'No sé cómo hacer eso.';
  }
}

// ─── Photo handler ──────────────────────────────────────────────────────────────

bot.on('message:photo', async (ctx) => {
  if (!ctx.from) return;
  const telegramId = String(ctx.from.id);

  const state = await getUserState(telegramId);
  if (!state) { await ctx.reply('Usa /start primero.'); return; }

  if (state.state === 'has_account_no_agents') {
    await ctx.reply('Primero necesitas un agente. Dime un nombre y lo creo.');
    return;
  }

  await ctx.reply('📄 Procesando...');

  const file = await ctx.getFile();
  const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Eres un extractor de recibos mexicanos. Devuelve SOLO JSON: { "servicio": "cfe"|"telmex"|"telcel"|"izzi"|null, "referencia": string|null, "monto": number|null, "vencimiento": string|null }',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extrae los datos:' },
            { type: 'image_url', image_url: { url: fileUrl } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) { await ctx.reply('No pude leer el recibo.'); return; }

    const data = JSON.parse(raw);
    const servicio = String(data.servicio ?? '').toLowerCase();
    const referencia = String(data.referencia ?? '');
    const monto = Number(data.monto) || 0;

    if (!['cfe', 'telmex', 'telcel', 'izzi'].includes(servicio) || !referencia || monto <= 0) {
      await ctx.reply('No pude identificar todos los datos. Asegúrate de que la foto sea clara.');
      return;
    }

    const agent = state.user.agents[0];
    const rules = await prisma.spendingRule.findMany({
      where: { userId: state.user.id, enabled: true, service: servicio, OR: [{ agentId: agent.id }, { agentId: null }] },
    });

    if (rules.length === 0) {
      await ctx.reply(`📄 *${servicio.toUpperCase()}* — $${monto} MXN — Ref: ${referencia}\n\nNo hay reglas para este servicio. ¿Creo una con límite de $${monto} MXN?`, { parse_mode: 'Markdown' });
      return;
    }

    const maxAllowed = Math.max(...rules.map((r: any) => r.maxAmount));
    if (monto > maxAllowed) {
      await ctx.reply(`⚠️ El monto ($${monto}) excede el máximo de tu regla ($${maxAllowed}).\n\nDime: *"sube CFE a ${Math.ceil(monto / 500) * 500}"* y vuelvo a procesar el recibo.`);
      return;
    }

    const confirmRule = rules.find((r: any) => r.requiresConfirmation && monto >= (r.confirmationThreshold ?? Infinity));
    if (confirmRule) {
      await ctx.reply(`📄 *${servicio.toUpperCase()}* — $${monto.toLocaleString()} MXN\nRef: \`${referencia}\`\nAgente: *${agent.name}*\n\n⚠️ Requiere confirmación. ¿Respondo *"Sí"* para autorizar.`, { parse_mode: 'Markdown' });
      pendingConfirmations.set(telegramId, { userId: state.user.id, agentId: agent.id, service: servicio, reference: referencia, amount: monto, previousCredits: state.user.credits });
    } else {
      const r = await deductAndRecord(state.user.id, agent.id, servicio, referencia, monto, state.user.credits);
      await ctx.reply(r, { parse_mode: 'Markdown' });
    }
  } catch {
    await ctx.reply('Error al procesar la imagen. Intenta de nuevo.');
  }
});

// ─── /start command ─────────────────────────────────────────────────────────────

bot.command('start', async (ctx) => {
  if (!ctx.from) return;
  const telegramId = String(ctx.from.id);
  const name = ctx.from.first_name ?? 'Usuario';

  const state = await getUserState(telegramId);
  if (state) {
    await sendOnboarding(ctx, state.state, name);
    return;
  }

  await ctx.reply(
    `Hola ${name}! 👋\n\n` +
    `Soy tu agente financiero de open402.\n\n` +
    `Para empezar, abre el dashboard y vincula tu cuenta:\n${webappUrl}/?telegram_id=${telegramId}\n\n` +
    `Después vuelve aquí y te guío.`
  );
});

// ─── Server ─────────────────────────────────────────────────────────────────────

if (isDev) {
  console.log('🤖 Bot iniciado en modo polling...');
  bot.start({ drop_pending_updates: true });
} else {
  const handler = webhookCallback(bot, 'http');
  const server = createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/webhook') {
      handler(req, res);
    } else {
      res.writeHead(200).end('OK');
    }
  });
  const port = parseInt(process.env.PORT ?? '8080', 10);
  server.listen(port, () => {
    console.log(`🤖 Bot webhook listening on :${port}`);
  });
}

export default bot;
