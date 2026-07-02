import { SpendingRule, PolicyDecision, CreateSpendingRuleInput } from './types';
import { PolicyEngine } from './policy-engine';
import { NoirProver, ProofInputs } from './zk/prove';
import { ZKSubmitter, ContractState } from './zk/submit';
import {
  getCurrentWindowId,
  shouldResetWindow,
  createInitialState,
  WindowState,
} from './zk/window';
import { Keypair } from '@stellar/stellar-sdk';

export interface ZKConfig {
  signer: Keypair;
  agentAddress: string;
  circuitDir: string;
  nargoPath?: string;
}

export class ZKPolicyEngine extends PolicyEngine {
  private prover: NoirProver;
  private submitter: ZKSubmitter;
  private config: ZKConfig;
  private windowState: WindowState;

  constructor(
    rules: SpendingRule[],
    config: ZKConfig,
    submitter: ZKSubmitter,
  ) {
    super(rules);
    this.config = config;
    this.prover = new NoirProver(config.circuitDir, config.nargoPath);
    this.submitter = submitter;
    this.windowState = createInitialState(getCurrentWindowId());
  }

  async evaluateZK(
    amount: bigint,
    spendingLimit: bigint,
  ): Promise<PolicyDecision> {
    const currentWindowId = getCurrentWindowId();

    if (shouldResetWindow(this.windowState.windowId)) {
      this.windowState = createInitialState(currentWindowId);
    }

    const newAccumulated = this.windowState.accumulated + amount;
    const newNonce = BigInt(
      crypto.getRandomValues(new Uint8Array(8)).reduce(
        (a, b) => (a << 8n) + BigInt(b), 0n
      ),
    );

    const oldCommitment = await this.prover.computeCommitment({
      accumulated: this.windowState.accumulated,
      nonce: this.windowState.nonce,
      windowId: BigInt(this.windowState.windowId),
    });

    const newCommitment = await this.prover.computeCommitment({
      accumulated: newAccumulated,
      nonce: newNonce,
      windowId: BigInt(currentWindowId),
    });

    const inputs: ProofInputs = {
      spendingLimit,
      windowId: BigInt(currentWindowId),
      oldCommitment,
      newCommitment,
      oldAccumulated: this.windowState.accumulated,
      oldNonce: this.windowState.nonce,
      amount,
      newNonce,
    };

    const proof = await this.prover.generateProof(inputs);

    const accepted = await this.submitter.verifyAndAdvance(
      this.config.signer,
      this.config.agentAddress,
      proof,
      newCommitment,
      BigInt(currentWindowId),
    );

    if (!accepted) {
      return {
        allowed: false,
        reason: 'ZK proof rejected by Soroban verifier contract',
      };
    }

    this.windowState = {
      accumulated: newAccumulated,
      nonce: newNonce,
      windowId: currentWindowId,
    };

    return { allowed: true };
  }

  async getOnChainState(): Promise<ContractState> {
    return this.submitter.getState(this.config.agentAddress);
  }

  getCurrentWindowState(): WindowState {
    return { ...this.windowState };
  }
}
