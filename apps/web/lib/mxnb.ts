import { Horizon, Asset, rpc, nativeToScVal, scValToNative } from '@stellar/stellar-sdk';

const MXM_ASSET_CODE = 'MXM';
const MXM_ISSUER_MAINNET = 'GC3CW7EDYRTWQ635VDIGY6S4ZUF5L6TQ7AA4MWS7LEQDBLUSZXV7UPS4';
const MXM_ISSUER_TESTNET = 'GC3CW7EDYRTWQ635VDIGY6S4ZUF5L6TQ7AA4MWS7LEQDBLUSZXV7UPS4';

const MXM_SOROBAN_MAINNET = '';
const MXM_SOROBAN_TESTNET = '';

const MXM_DECIMALS = 7;

type NetworkId = 'stellar-mainnet' | 'stellar-testnet';

function getHorizonUrl(networkId: NetworkId): string {
  return networkId === 'stellar-testnet'
    ? 'https://horizon-testnet.stellar.org'
    : 'https://horizon.stellar.org';
}

function getIssuer(networkId: NetworkId): string {
  return networkId === 'stellar-testnet' ? MXM_ISSUER_TESTNET : MXM_ISSUER_MAINNET;
}

export function createMxmHorizonClient(networkId: NetworkId): Horizon.Server {
  return new Horizon.Server(getHorizonUrl(networkId));
}

export async function getMxmBalance(
  walletAddress: string,
  networkId: NetworkId = 'stellar-testnet',
): Promise<number> {
  const horizon = createMxmHorizonClient(networkId);
  const issuer = getIssuer(networkId);

  try {
    const account = await horizon.loadAccount(walletAddress);
    const balances = account.balances as unknown as Array<Record<string, string>>;

    for (const bal of balances) {
      if (
        bal.asset_code === MXM_ASSET_CODE &&
        bal.asset_issuer === issuer
      ) {
        return parseFloat(bal.balance);
      }
    }
    return 0;
  } catch {
    return 0;
  }
}

export async function getMxmDecimals(): Promise<number> {
  return MXM_DECIMALS;
}

export function mxmToStroops(amount: number): bigint {
  return BigInt(Math.round(amount * Math.pow(10, MXM_DECIMALS)));
}

export function stroopsToMxm(stroops: bigint): number {
  return Number(stroops) / Math.pow(10, MXM_DECIMALS);
}

export {
  MXM_ASSET_CODE,
  MXM_ISSUER_MAINNET,
  MXM_ISSUER_TESTNET,
  MXM_SOROBAN_MAINNET,
  MXM_SOROBAN_TESTNET,
  MXM_DECIMALS,
};
export type { NetworkId };
