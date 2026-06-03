import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import type { WebhookEvent } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return Response.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ error: 'Missing CLERK_WEBHOOK_SECRET' }, { status: 500 });
  }

  const wh = new Webhook(secret);
  const payload = await req.text();
  const evt = wh.verify(payload, {
    'svix-id': svixId,
    'svix-timestamp': svixTimestamp,
    'svix-signature': svixSignature,
  }) as WebhookEvent;

  switch (evt.type) {
    case 'user.created': {
      const { id, email_addresses, first_name } = evt.data;
      const email = email_addresses?.[0]?.email_address;
      if (!email) break;

      await prisma.user.upsert({
        where: { id },
        update: { name: first_name ?? null },
        create: { id, email, name: first_name ?? null },
      });
      break;
    }

    case 'user.updated': {
      const { id, email_addresses, first_name } = evt.data;
      const email = email_addresses?.[0]?.email_address;
      if (!email) break;

      await prisma.user.update({
        where: { id },
        data: { email, name: first_name ?? null },
      });
      break;
    }

    case 'user.deleted': {
      const { id } = evt.data;
      if (id) {
        await prisma.user.delete({ where: { id } }).catch(() => {});
      }
      break;
    }
  }

  return Response.json({ success: true });
}
