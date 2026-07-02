export const MS_PER_WINDOW = 86400000; // 24 hours

export interface WindowState {
  accumulated: bigint;
  nonce: bigint;
  windowId: number;
}

export function getCurrentWindowId(): number {
  return Math.floor(Date.now() / MS_PER_WINDOW);
}

export function shouldResetWindow(stateWindowId: number): boolean {
  return getCurrentWindowId() !== stateWindowId;
}

export function createInitialState(windowId: number): WindowState {
  const buf = crypto.getRandomValues(new Uint8Array(8));
  const nonce = buf.reduce((a, b) => (a << 8n) + BigInt(b), 0n);
  return { accumulated: 0n, nonce, windowId };
}
