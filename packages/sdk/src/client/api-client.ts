import {
  AgentXConfig,
  SpendingRule,
  Transaction,
  BillPaymentRequest,
  BillPaymentResult,
  CreditPurchaseRequest,
  CreditPurchaseResult,
} from '../types';
import type { WalletBalance } from '../wallet';

export class ApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: AgentXConfig) {
    this.baseUrl = config.apiUrl ?? 'https://api.open402.dev';
    this.apiKey = config.apiKey;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(`API ${res.status}: ${err.message}`);
    }

    return res.json();
  }

  // Agents
  createAgent(name: string): Promise<{ id: string; address: string }> {
    return this.request('POST', '/agents', { name });
  }

  getAgent(id: string): Promise<{ id: string; name: string; address: string; balance: number }> {
    return this.request('GET', `/agents/${id}`);
  }

  listAgents(): Promise<Array<{ id: string; name: string; address: string; balance: number }>> {
    return this.request('GET', '/agents');
  }

  // Credit balance
  getBalance(): Promise<{ available: number; reserved: number; total: number }> {
    return this.request('GET', '/credits/balance');
  }

  purchaseCredits(input: CreditPurchaseRequest): Promise<CreditPurchaseResult> {
    return this.request('POST', '/credits/purchase', input);
  }

  // Policies
  addPolicy(agentId: string, rule: SpendingRule): Promise<SpendingRule> {
    return this.request('POST', `/agents/${agentId}/policies`, rule);
  }

  updatePolicy(agentId: string, ruleId: string, rule: Partial<SpendingRule>): Promise<SpendingRule> {
    return this.request('PATCH', `/agents/${agentId}/policies/${ruleId}`, rule);
  }

  removePolicy(agentId: string, ruleId: string): Promise<void> {
    return this.request('DELETE', `/agents/${agentId}/policies/${ruleId}`);
  }

  listPolicies(agentId: string): Promise<SpendingRule[]> {
    return this.request('GET', `/agents/${agentId}/policies`);
  }

  // Payments
  payBill(agentId: string, request: BillPaymentRequest): Promise<BillPaymentResult> {
    return this.request('POST', `/agents/${agentId}/payments/bill`, request);
  }

  payX402(agentId: string, request: { url: string; method: string; headers?: Record<string, string>; body?: unknown }): Promise<{ success: boolean; cost: number; data?: unknown }> {
    return this.request('POST', `/agents/${agentId}/payments/x402`, request);
  }

  // Transactions
  getTransactions(agentId: string, limit?: number): Promise<Transaction[]> {
    const query = limit ? `?limit=${limit}` : '';
    return this.request('GET', `/agents/${agentId}/transactions${query}`);
  }

  // Wallets
  createWallet(networkId: string): Promise<{ address: string }> {
    return this.request('POST', '/wallets', { networkId });
  }

  getWalletBalance(address: string): Promise<{ mxm: string; xlm: string }> {
    return this.request('GET', `/wallets/${address}/balance`);
  }

  transferMXM(from: string, to: string, amount: string): Promise<{ txHash: string }> {
    return this.request('POST', '/wallets/transfer', { from, to, amount });
  }
}
