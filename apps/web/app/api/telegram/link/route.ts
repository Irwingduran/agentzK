import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(chatId: string, text: string) {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
  } catch (e) {
    console.error('Failed to send Telegram message:', e);
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { telegramId } = await req.json();
  if (!telegramId) {
    return Response.json({ error: 'telegramId requerido' }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { telegramId },
  });

  if (existingUser && existingUser.id !== userId) {
    return Response.json({
      error: 'Esta cuenta de Telegram ya está vinculada a otro usuario',
    }, { status: 409 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { telegramId },
  });

  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { telegramId },
  });

  await sendTelegramMessage(telegramId,
    `✅ *Cuenta vinculada correctamente,* ${user.name ?? 'usuario'}!\n\n` +
    `Ya puedes gestionar tus agentes desde aqu\u00ed.\n\n` +
    `/saldo — Ver tu saldo de cr\u00e9ditos\n` +
    `/agentes — Listar tus agentes\n` +
    `/comprar — Comprar m\u00e1s cr\u00e9ditos\n` +
    `/historial — \u00daltimas transacciones\n` +
    `/ayuda — Todos los comandos`
  );

  return Response.json({ success: true });
}
