import { SpendingRule, PolicyDecision, CreateSpendingRuleInput } from './types';

export class PolicyEngine {
  private rules: Map<string, SpendingRule> = new Map();

  constructor(rules: SpendingRule[] = []) {
    for (const rule of rules) {
      this.rules.set(rule.id, rule);
    }
  }

  evaluate(service: string, amount: number): PolicyDecision {
    const matchedRules: SpendingRule[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;
      if (rule.service === '*' || rule.service === service) {
        matchedRules.push(rule);
      }
    }

    if (matchedRules.length === 0) {
      return { allowed: true };
    }

    for (const rule of matchedRules) {
      if (amount > rule.maxAmount) {
        return {
          allowed: false,
          reason: `Amount ${amount} exceeds rule limit of ${rule.maxAmount} for service "${rule.service}"`,
          requiresConfirmation: rule.requiresConfirmation,
        };
      }
    }

    const needsConfirmation = matchedRules.some(
      (r) =>
        r.requiresConfirmation &&
        r.confirmationThreshold !== undefined &&
        amount > r.confirmationThreshold
    );

    if (needsConfirmation) {
      return {
        allowed: false,
        reason: `Amount ${amount} requires user confirmation`,
        requiresConfirmation: true,
      };
    }

    return { allowed: true };
  }

  addRule(input: CreateSpendingRuleInput): SpendingRule {
    const rule: SpendingRule = {
      id: crypto.randomUUID(),
      service: input.service,
      maxAmount: input.maxAmount,
      requiresConfirmation: input.requiresConfirmation ?? false,
      confirmationThreshold: input.confirmationThreshold,
      schedule: input.schedule,
      enabled: input.enabled ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.rules.set(rule.id, rule);
    return rule;
  }

  updateRule(id: string, input: Partial<CreateSpendingRuleInput>): SpendingRule | null {
    const existing = this.rules.get(id);
    if (!existing) return null;

    const updated: SpendingRule = {
      ...existing,
      service: input.service ?? existing.service,
      maxAmount: input.maxAmount ?? existing.maxAmount,
      requiresConfirmation: input.requiresConfirmation ?? existing.requiresConfirmation,
      confirmationThreshold: input.confirmationThreshold ?? existing.confirmationThreshold,
      schedule: input.schedule ?? existing.schedule,
      enabled: input.enabled ?? existing.enabled,
      updatedAt: new Date(),
    };
    this.rules.set(id, updated);
    return updated;
  }

  removeRule(id: string): boolean {
    return this.rules.delete(id);
  }

  getRules(): SpendingRule[] {
    return Array.from(this.rules.values());
  }

  getRule(id: string): SpendingRule | undefined {
    return this.rules.get(id);
  }
}
