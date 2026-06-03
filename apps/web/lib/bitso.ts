const BITSO_API_BASE = process.env.BITSO_API_URL ?? 'https://api.bitso.com/v3';
const BITSO_API_KEY = process.env.BITSO_API_KEY ?? '';
const BITSO_API_SECRET = process.env.BITSO_API_SECRET ?? '';

interface BitsoDepositInstructions {
  deposit_id: string;
  clabe: string;
  reference: string;
  amount: number;
  currency: string;
  concept: string;
  expires_at: string;
}

interface BitsoDepositStatus {
  deposit_id: string;
  status: 'pending' | 'confirmed' | 'failed' | 'expired';
  amount: number;
  currency: string;
  confirmed_amount?: number;
  confirmed_at?: string;
  created_at: string;
}

const IS_MOCK = !BITSO_API_KEY || !BITSO_API_SECRET;

function generateId(): string {
  return `dep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function bitsoRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  if (IS_MOCK) {
    return handleMockRequest<T>(method, path, body);
  }

  const nonce = String(Date.now());
  const url = `${BITSO_API_BASE}${path}`;
  const payload = body ? JSON.stringify(body) : '';
  const signature = await generateSignature(nonce, method, path, payload);

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bitso ${BITSO_API_KEY}:${nonce}:${signature}`,
      'Content-Type': 'application/json',
    },
    body: payload || undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Bitso API error (${res.status}): ${err}`);
  }

  const json = await res.json();
  return json.payload ?? json;
}

async function generateSignature(
  nonce: string,
  method: string,
  path: string,
  payload: string,
): Promise<string> {
  const data = `${nonce}${method}${path}${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(BITSO_API_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// --- Mock handlers for development ---

const mockState = new Map<string, BitsoDepositStatus>();

async function handleMockRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  await sleep(300);

  if (method === 'POST' && path === '/mxnb/deposit') {
    const amount = (body?.source_amount as number) ?? 100;
    const depositId = generateId();
    const status: BitsoDepositStatus = {
      deposit_id: depositId,
      status: 'pending',
      amount,
      currency: 'MXN',
      created_at: new Date().toISOString(),
    };
    mockState.set(depositId, status);

    return {
      deposit_id: depositId,
      clabe: '646180115400345678',
      reference: `OPEN${String(Date.now()).slice(-8)}`,
      amount,
      currency: 'MXN',
      concept: 'Compra MXNB — open402',
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    } as T;
  }

  if (method === 'GET' && path.startsWith('/mxnb/deposit/')) {
    const depositId = path.split('/')[3];
    const status = mockState.get(depositId);
    if (!status) {
      throw new Error(`Deposit not found: ${depositId}`);
    }

    if (status.status === 'pending' && Date.now() - new Date(status.created_at).getTime() > 5000) {
      status.status = 'confirmed';
      status.confirmed_amount = status.amount;
      status.confirmed_at = new Date().toISOString();
      mockState.set(depositId, status);
    }

    return status as T;
  }

  throw new Error(`Mock not implemented: ${method} ${path}`);
}

// --- Public API ---

export async function createMxnbDepositInstructions(
  amountMXN: number,
): Promise<BitsoDepositInstructions> {
  return bitsoRequest<BitsoDepositInstructions>('POST', '/mxnb/deposit', {
    source_amount: amountMXN,
  });
}

export async function checkMxnbDepositStatus(
  depositId: string,
): Promise<BitsoDepositStatus> {
  return bitsoRequest<BitsoDepositStatus>('GET', `/mxnb/deposit/${depositId}`);
}

export function isBitsoConfigured(): boolean {
  return !IS_MOCK;
}
