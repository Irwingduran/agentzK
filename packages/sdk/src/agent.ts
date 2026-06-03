import {
  AgentConfig,
  SpendingRule,
  CreateSpendingRuleInput,
  PolicyDecision,
  Transaction,
  BillPaymentRequest,
  BillPaymentResult,
  X402PaymentRequest,
  X402PaymentResult,
  WalletConfig,
} from './types';
import { ApiClient } from './client/api-client';
import { PolicyEngine } from './policy-engine';
import { AgentWallet } from './wallet';
import { BillPaymentHandler } from './payments/bill-payment';
import { X402PaymentHandler } from './payments/x402';

export class Agent {
  readonly id: string;
  readonly name: string;
  readonly wallet: AgentWallet;
  readonly policies: PolicyEngine;

  private client: ApiClient;
  private billPayments: BillPaymentHandler;
  private x402Payments: X402PaymentHandler;

  constructor(
    id: string,
    name: string,
    wallet: AgentWallet,
    policies: SpendingRule[],
    client: ApiClient
  ) {
    this.id = id;
    this.name = name;
    this.wallet = wallet;
    this.policies = new PolicyEngine(policies);
    this.client = client;
    this.billPayments = new BillPaymentHandler(client, id);
    this.x402Payments = new X402PaymentHandler(wallet);
  }

  async payBill(request: BillPaymentRequest): Promise<BillPaymentResult> {
    const decision = this.policies.evaluate(request.service, request.amount);
    if (!decision.allowed) {
      throw new PolicyError(decision.reason, decision.requiresConfirmation);
    }

    return this.billPayments.pay(request);
  }

  async payX402(request: X402PaymentRequest): Promise<X402PaymentResult> {
    const decision = this.policies.evaluate('x402', 0);
    if (!decision.allowed) {
      throw new PolicyError(decision.reason, decision.requiresConfirmation);
    }

    return this.x402Payments.pay(request);
  }

  async getBalance(): Promise<number> {
    const balance = await this.client.getBalance();
    return balance.available;
  }

  async getHistory(limit = 20): Promise<Transaction[]> {
    return this.client.getTransactions(this.id, limit);
  }

  addRule(input: CreateSpendingRuleInput): SpendingRule {
    return this.policies.addRule(input);
  }

  updateRule(id: string, input: Partial<CreateSpendingRuleInput>): SpendingRule | null {
    return this.policies.updateRule(id, input);
  }

  removeRule(id: string): boolean {
    return this.policies.removeRule(id);
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      wallet: this.wallet.toJSON(),
      policies: this.policies.getRules(),
    };
  }
}

export class PolicyError extends Error {
  readonly requiresConfirmation: boolean;

  constructor(message: string, requiresConfirmation?: boolean) {
    super(message);
    this.name = 'PolicyError';
    this.requiresConfirmation = requiresConfirmation ?? false;
  }
}
