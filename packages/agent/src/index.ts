import { Keypair, TransactionBuilder, BASE_FEE, Operation, Asset, Horizon } from '@stellar/stellar-sdk';
import { AgentXActionProvider } from '@open402/agentkit';
import { AgentX, type Agent as SDKAgent, DEFAULT_NETWORK, NETWORKS } from '@open402/agents';

export interface AgentConfig {
  stellarSecretKey?: string;
  networkId?: string;
  open402ApiKey?: string;
}

export class AgentRuntime {
  private config: AgentConfig;
  private keypair?: Keypair;
  private sdkAgent?: SDKAgent;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  async initialize(sdkAgent?: SDKAgent): Promise<void> {
    if (this.config.stellarSecretKey) {
      this.keypair = Keypair.fromSecret(this.config.stellarSecretKey);
    }

    this.sdkAgent = sdkAgent;
  }

  private getHorizon(): Horizon.Server {
    const networkId = this.getNetworkId();
    const network = NETWORKS[networkId as keyof typeof NETWORKS] ?? NETWORKS[DEFAULT_NETWORK];
    return new Horizon.Server(network.horizonUrl);
  }

  async getLangChainTools(): Promise<unknown[]> {
    const { AgentKit, walletActionProvider } = await import('@coinbase/agentkit');
    const { getLangChainTools } = await import('@coinbase/agentkit-langchain');

    const actionProviders: unknown[] = [walletActionProvider()];

    if (this.sdkAgent && this.config.open402ApiKey) {
      const open402 = await AgentX.create({
        apiKey: this.config.open402ApiKey,
      });
      actionProviders.push(new AgentXActionProvider(open402, this.sdkAgent));
    }

    const agentKit = await AgentKit.from({
      walletProvider: this.getWalletProvider() as never,
      actionProviders: actionProviders as never,
    });

    return getLangChainTools(agentKit as never);
  }

  async getVercelAITools(): Promise<unknown> {
    const { getVercelAITools } = await import('@coinbase/agentkit-vercel-ai-sdk');
    const { AgentKit, walletActionProvider } = await import('@coinbase/agentkit');

    const actionProviders: unknown[] = [walletActionProvider()];

    if (this.sdkAgent && this.config.open402ApiKey) {
      const open402 = await AgentX.create({
        apiKey: this.config.open402ApiKey,
      });
      actionProviders.push(new AgentXActionProvider(open402, this.sdkAgent));
    }

    const agentKit = await AgentKit.from({
      walletProvider: this.getWalletProvider() as never,
      actionProviders: actionProviders as never,
    });

    return getVercelAITools(agentKit);
  }

  private getWalletProvider() {
    return {
      getAddress: () => this.keypair?.publicKey() ?? '',
      getNetwork: () => ({
        protocolFamily: 'stellar' as const,
        networkId: this.getNetworkId(),
      }),
      getName: () => 'StellarWalletProvider',
      getBalance: async () => BigInt(0),
      nativeTransfer: async (_to: string, _value: string) => '',
    };
  }

  private getNetworkPassphrase(): string {
    const networkId = this.getNetworkId();
    const network = NETWORKS[networkId as keyof typeof NETWORKS] ?? NETWORKS[DEFAULT_NETWORK];
    return network.networkPassphrase;
  }

  getWalletAddress(): string {
    return this.keypair?.publicKey() ?? '';
  }

  getNetworkId(): string {
    return this.config.networkId ?? DEFAULT_NETWORK;
  }
}
