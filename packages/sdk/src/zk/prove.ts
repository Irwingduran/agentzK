import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import os from 'os';

export interface ProofInputs {
  spendingLimit: bigint;
  windowId: bigint;
  oldCommitment: string;
  newCommitment: string;
  oldAccumulated: bigint;
  oldNonce: bigint;
  amount: bigint;
  newNonce: bigint;
}

export interface CommitmentInputs {
  accumulated: bigint;
  nonce: bigint;
  windowId: bigint;
}

export class NoirProver {
  private circuitDir: string;
  private nargoPath: string;

  constructor(circuitDir: string, nargoPath = 'nargo') {
    this.circuitDir = circuitDir;
    this.nargoPath = nargoPath;
  }

  async computeCommitment(inputs: CommitmentInputs): Promise<string> {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentzk-'));
    try {
      const toml = [
        `accumulated = "${inputs.accumulated.toString()}"`,
        `nonce = "${inputs.nonce.toString()}"`,
        `window_id = "${inputs.windowId.toString()}"`,
      ].join('\n');
      fs.writeFileSync(path.join(tmpDir, 'Prover.toml'), toml);

      const out = execSync(`${this.nargoPath} execute compute_commitment`, {
        cwd: this.circuitDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return out.trim();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  async generateProof(
    inputs: ProofInputs,
    proofName = 'spending_proof',
  ): Promise<Uint8Array> {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentzk-'));
    try {
      const toml = [
        `spending_limit = "${inputs.spendingLimit.toString()}"`,
        `window_id = "${inputs.windowId.toString()}"`,
        `old_commitment = "${inputs.oldCommitment}"`,
        `new_commitment = "${inputs.newCommitment}"`,
        `old_accumulated = "${inputs.oldAccumulated.toString()}"`,
        `old_nonce = "${inputs.oldNonce.toString()}"`,
        `amount = "${inputs.amount.toString()}"`,
        `new_nonce = "${inputs.newNonce.toString()}"`,
      ].join('\n');
      fs.writeFileSync(path.join(tmpDir, 'Prover.toml'), toml);

      execSync(`${this.nargoPath} prove ${proofName}`, {
        cwd: this.circuitDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      return fs.readFileSync(path.join(tmpDir, 'proofs', `${proofName}.proof`));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}
