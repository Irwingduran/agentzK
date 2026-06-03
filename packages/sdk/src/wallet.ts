import {
  Keypair,
  TransactionBuilder,
  BASE_FEE,
  Operation,
  Asset,
  Horizon,
} from '@stellar/stellar-sdk';
import { WalletConfig, NetworkConfig, NETWORKS, DEFAULT_NETWORK } from './types';
import { ApiClient } from './client/api-client';

export interface WalletBalance {
  mxm: bigint;
  xlm: bigint;
}

export class AgentWallet {
  readonly address: string;
  readonly keypair: Keypair;
  readonly network: NetworkConfig;

  private walletConfig: WalletConfig;
  private client?: ApiClient;

  constructor(keypair: Keypair, config: WalletConfig, client?: ApiClient) {
    this.keypair = keypair;
    this.address = keypair.publicKey();
    this.walletConfig = config;
    this.network = NETWORKS[config.networkId] ?? NETWORKS[DEFAULT_NETWORK];
    this.client = client;
  }

  static async create(config: WalletConfig, client?: ApiClient): Promise<AgentWallet> {
    const keypair = Keypair.random();
    return new AgentWallet(keypair, config, client);
  }

  static async import(config: WalletConfig, address: string, client?: ApiClient): Promise<AgentWallet> {
    const keypair = Keypair.fromPublicKey(address);
    return new AgentWallet(keypair, config, client);
  }

  get secretKey(): string {
    return this.keypair.secret();
  }

  private getHorizon(): Horizon.Server {
    return new Horizon.Server(this.network.horizonUrl);
  }

  private getPassphrase(): string {
    return this.network.networkPassphrase;
  }

  async getBalance(): Promise<WalletBalance> {
    try {
      const horizon = this.getHorizon();
      const account = await horizon.loadAccount(this.address);

      let mxm = 0n;
      let xlm = 0n;

      const rawBalances = account.balances as unknown as Array<Record<string, string>>;
      for (const bal of rawBalances) {
        if (bal.asset_type === 'native') {
          xlm = BigInt(Math.floor(parseFloat(bal.balance) * 10_000_000));
        } else if (
          bal.asset_type === 'credit_alphanum4' ||
          bal.asset_type === 'credit_alphanum12'
        ) {
          if (
            bal.asset_code === this.network.mxmAsset.code &&
            bal.asset_issuer === this.network.mxmAsset.issuer
          ) {
            mxm = BigInt(Math.floor(parseFloat(bal.balance) * 10_000_000));
          }
        }
      }

      return { mxm, xlm };
    } catch {
      return { mxm: 0n, xlm: 0n };
    }
  }

  async getMxmBalance(): Promise<bigint> {
    const bal = await this.getBalance();
    return bal.mxm;
  }

  async getXlmBalance(): Promise<bigint> {
    const bal = await this.getBalance();
    return bal.xlm;
  }

  async sendMXM(to: string, amount: string): Promise<string> {
    const horizon = this.getHorizon();
    const account = await horizon.loadAccount(this.address);

    const mxmAsset = new Asset(
      this.network.mxmAsset.code,
      this.network.mxmAsset.issuer,
    );

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Invalid amount');
    }

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.getPassphrase(),
    })
      .addOperation(Operation.payment({
        destination: to,
        asset: mxmAsset,
        amount: parsedAmount.toFixed(7),
      }))
      .setTimeout(30)
      .build();

    tx.sign(this.keypair);
    const result = await horizon.submitTransaction(tx);
    return result.hash;
  }

  async sendXLM(to: string, amount: string): Promise<string> {
    const horizon = this.getHorizon();
    const account = await horizon.loadAccount(this.address);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Invalid amount');
    }

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.getPassphrase(),
    })
      .addOperation(Operation.payment({
        destination: to,
        asset: Asset.native(),
        amount: parsedAmount.toFixed(7),
      }))
      .setTimeout(30)
      .build();

    tx.sign(this.keypair);
    const result = await horizon.submitTransaction(tx);
    return result.hash;
  }

  async changeTrust(assetCode: string, assetIssuer: string, limit?: string): Promise<string> {
    const horizon = this.getHorizon();
    const account = await horizon.loadAccount(this.address);
    const asset = new Asset(assetCode, assetIssuer);

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.getPassphrase(),
    })
      .addOperation(Operation.changeTrust({
        asset,
        limit: limit ?? '922337203685.4775807',
      }))
      .setTimeout(30)
      .build();

    tx.sign(this.keypair);
    const result = await horizon.submitTransaction(tx);
    return result.hash;
  }

  async getSorobanContractId(): Promise<string> {
    return this.network.mxmSorobanId;
  }

  toJSON(): Record<string, unknown> {
    return {
      address: this.address,
      networkId: this.walletConfig.networkId,
      network: this.network.network,
    };
  }
}
