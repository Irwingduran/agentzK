import type { SpendingRule } from './policies';

export type NetworkId =
  | 'stellar-mainnet'
  | 'stellar-testnet';

export interface NetworkConfig {
  network: 'stellar-mainnet' | 'stellar-testnet';
  networkPassphrase: string;
  caip2: string;
  horizonUrl: string;
  sorobanRpcUrl: string;
  mxmAsset: {
    code: string;
    issuer: string;
  };
  mxmSorobanId: string;
  explorerUrl: string;
  facilitatorUrl: string;
}

export const NETWORKS: Record<NetworkId, NetworkConfig> = {
  'stellar-mainnet': {
    network: 'stellar-mainnet',
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
    caip2: 'stellar:public',
    horizonUrl: 'https://horizon.stellar.org',
    sorobanRpcUrl: 'https://rpc.mainnet.stellar.gateway.money',
    mxmAsset: {
      code: 'MXM',
      issuer: 'GC3CW7EDYRTWQ635VDIGY6S4ZUF5L6TQ7AA4MWS7LEQDBLUSZXV7UPS4',
    },
    mxmSorobanId: 'CCK5M5A4E5Z5P6K7L8M9N0O1P2Q3R4S5T6U7V8W9X0Y1Z2A3B4C5D6E7F',
    explorerUrl: 'https://stellar.expert',
    facilitatorUrl: 'https://api.cdp.coinbase.com/platform/v2/x402',
  },
  'stellar-testnet': {
    network: 'stellar-testnet',
    networkPassphrase: 'Test SDF Network ; September 2015',
    caip2: 'stellar:testnet',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    sorobanRpcUrl: 'https://rpc.testnet.stellar.gateway.money',
    mxmAsset: {
      code: 'MXM',
      issuer: 'GC3CW7EDYRTWQ635VDIGY6S4ZUF5L6TQ7AA4MWS7LEQDBLUSZXV7UPS4',
    },
    mxmSorobanId: 'CA3A4B5C6D7E8F9G0H1I2J3K4L5M6N7O8P9Q0R1S2T3U4V5W6X7Y8Z9A0B',
    explorerUrl: 'https://stellar.expert',
    facilitatorUrl: 'https://api.cdp.coinbase.com/platform/v2/x402',
  },
};

export const DEFAULT_NETWORK: NetworkId = 'stellar-testnet';

export interface AgentXConfig {
  apiKey: string;
  apiUrl?: string;
  networkId?: NetworkId;
}

export interface WalletConfig {
  networkId: NetworkId;
  stellarSecretKey?: string;
}

export interface AgentConfig {
  name: string;
  wallet?: WalletConfig;
  policies?: SpendingRule[];
}
