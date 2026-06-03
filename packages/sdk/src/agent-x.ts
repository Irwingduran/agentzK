import {
  AgentXConfig,
  AgentConfig,
  BillPaymentRequest,
  BillPaymentResult,
  X402PaymentRequest,
  X402PaymentResult,
  CreditPurchaseRequest,
  CreditPurchaseResult,
  DEFAULT_NETWORK,
} from './types';

interface CreditBalance {
  available: number;
  reserved: number;
  total: number;
  currency: 'credits';
}
import { ApiClient } from './client/api-client';
import { Agent } from './agent';
import { AgentWallet } from './wallet';

export class AgentX {
  private client: ApiClient;
  private agents: Map<string, Agent> = new Map();

  private constructor(config: AgentXConfig) {
    this.client = new ApiClient(config);
  }

  static async create(config: AgentXConfig): Promise<AgentX> {
    return new AgentX(config);
  }

  async createAgent(name: string, config?: AgentConfig): Promise<Agent> {
    const walletConfig = config?.wallet ?? {
      networkId: DEFAULT_NETWORK,
    };

    const wallet = await AgentWallet.create(walletConfig, this.client);
    const serverAgent = await this.client.createAgent(name);

    const agent = new Agent(
      serverAgent.id,
      name,
      wallet,
      config?.policies ?? [],
      this.client
    );

    this.agents.set(agent.id, agent);
    return agent;
  }

  async getAgent(id: string): Promise<Agent> {
    const existing = this.agents.get(id);
    if (existing) return existing;

    const serverAgent = await this.client.getAgent(id);

    const wallet = await AgentWallet.import(
      { networkId: DEFAULT_NETWORK },
      serverAgent.address,
      this.client
    );

    const policies = await this.client.listPolicies(id);
    const agent = new Agent(id, serverAgent.name, wallet, policies, this.client);
    this.agents.set(id, agent);
    return agent;
  }

  async listAgents(): Promise<Agent[]> {
    const agents = await this.client.listAgents();
    const result: Agent[] = [];

    for (const sa of agents) {
      let agent = this.agents.get(sa.id);
      if (!agent) {
        const wallet = await AgentWallet.import(
          { networkId: DEFAULT_NETWORK },
          sa.address,
          this.client
        );
        const policies = await this.client.listPolicies(sa.id);
        agent = new Agent(sa.id, sa.name, wallet, policies, this.client);
        this.agents.set(sa.id, agent);
      }
      result.push(agent);
    }

    return result;
  }

  async getBalance(): Promise<CreditBalance> {
    const balance = await this.client.getBalance();
    return {
      available: balance.available,
      reserved: balance.reserved,
      total: balance.total,
      currency: 'credits',
    };
  }

  async purchaseCredits(request: CreditPurchaseRequest): Promise<CreditPurchaseResult> {
    return this.client.purchaseCredits(request);
  }

  async payBill(request: BillPaymentRequest): Promise<BillPaymentResult> {
    const agents = await this.listAgents();
    if (agents.length === 0) {
      throw new Error('No agents available. Create an agent first.');
    }
    return agents[0].payBill(request);
  }

  async payX402(request: X402PaymentRequest): Promise<X402PaymentResult> {
    const agents = await this.listAgents();
    if (agents.length === 0) {
      throw new Error('No agents available. Create an agent first.');
    }
    return agents[0].payX402(request);
  }
}
