import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

export interface AuditPayload {
  amount: bigint;
  oldAccumulated: bigint;
  newAccumulated: bigint;
  windowId: bigint;
  timestamp: number;
}

export interface EncryptedAudit {
  ciphertext: string;
  ephemeralPublicKey: string;
}

export function encryptForOperator(
  payload: AuditPayload,
  operatorPublicKey: Uint8Array,
): EncryptedAudit {
  const ephemeral = nacl.box.keyPair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const message = new TextEncoder().encode(JSON.stringify(payload, (_k, v) =>
    typeof v === 'bigint' ? v.toString() : v
  ));

  const ciphertext = nacl.box(
    message,
    nonce,
    operatorPublicKey,
    ephemeral.secretKey,
  );

  if (!ciphertext) {
    throw new Error('Encryption failed');
  }

  return {
    ciphertext: encodeBase64(nonce) + '.' + encodeBase64(ciphertext),
    ephemeralPublicKey: encodeBase64(ephemeral.publicKey),
  };
}

export function decryptWithViewKey(
  encrypted: EncryptedAudit,
  operatorSecretKey: Uint8Array,
): AuditPayload {
  const [nonceB64, cipherB64] = encrypted.ciphertext.split('.');
  const nonce = decodeBase64(nonceB64);
  const ciphertext = decodeBase64(cipherB64);
  const ephemeralPublicKey = decodeBase64(encrypted.ephemeralPublicKey);

  const plaintext = nacl.box.open(
    ciphertext,
    nonce,
    ephemeralPublicKey,
    operatorSecretKey,
  );

  if (!plaintext) {
    throw new Error('Decryption failed — invalid view key or corrupted payload');
  }

  const raw = JSON.parse(new TextDecoder().decode(plaintext));
  return {
    amount: BigInt(raw.amount),
    oldAccumulated: BigInt(raw.oldAccumulated),
    newAccumulated: BigInt(raw.newAccumulated),
    windowId: BigInt(raw.windowId),
    timestamp: raw.timestamp,
  };
}
