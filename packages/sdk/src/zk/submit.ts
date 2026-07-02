import {
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Address,
  Account,
  nativeToScVal,
  scValToNative,
  xdr,
  Keypair,
} from '@stellar/stellar-sdk';
import { Server } from '@stellar/stellar-sdk/rpc';
import type { Api } from '@stellar/stellar-sdk/rpc';

export interface ContractState {
  commitment: string | null;
  spendLimit: bigint | null;
  windowId: bigint | null;
}

export class ZKSubmitter {
  private server: Server;
  private contractId: string;
  private networkPassphrase: string;

  constructor(
    rpcUrl: string,
    contractId: string,
    networkPassphrase: string,
  ) {
    this.server = new Server(rpcUrl);
    this.contractId = contractId;
    this.networkPassphrase = networkPassphrase;
  }

  async register(
    signer: Keypair,
    agentAddress: string,
    spendingLimit: bigint,
    windowId: bigint,
    initialCommitment: string,
  ): Promise<string> {
    const source = await this.server.getAccount(signer.publicKey());
    const tx = this.buildTx(source, 'register', [
      Address.fromString(agentAddress).toScVal(),
      nativeToScVal(spendingLimit, { type: 'u64' }),
      nativeToScVal(windowId, { type: 'u64' }),
      xdr.ScVal.scvBytes(Buffer.from(initialCommitment.replace('0x', ''), 'hex')),
    ]);
    tx.sign(signer);
    const result = await this.server.sendTransaction(tx);
    if (result.status === 'PENDING' || result.status === 'DUPLICATE') {
      return result.hash;
    }
    throw new Error(`register failed: ${result.status}`);
  }

  async verifyAndAdvance(
    signer: Keypair,
    agentAddress: string,
    proof: Uint8Array,
    newCommitment: string,
    newWindowId: bigint,
  ): Promise<boolean> {
    const source = await this.server.getAccount(signer.publicKey());
    const tx = this.buildTx(source, 'verify_and_advance', [
      Address.fromString(agentAddress).toScVal(),
      xdr.ScVal.scvBytes(Buffer.from(proof)),
      xdr.ScVal.scvBytes(Buffer.from(newCommitment.replace('0x', ''), 'hex')),
      nativeToScVal(newWindowId, { type: 'u64' }),
    ]);
    tx.sign(signer);
    const result = await this.server.sendTransaction(tx);
    if (result.status !== 'PENDING' && result.status !== 'DUPLICATE') {
      throw new Error(`verify_and_advance failed: ${result.status}`);
    }

    const response = await this.server.getTransaction(result.hash);
    if (response.status !== 'SUCCESS') {
      throw new Error(`Transaction ${result.hash} status: ${response.status}`);
    }

    if (!response.returnValue) {
      throw new Error('No return value from verify_and_advance');
    }

    return scValToNative(response.returnValue) as boolean;
  }

  async getState(agentAddress: string): Promise<ContractState> {
    const [commitment, spendLimit, windowId] = await Promise.all([
      this.simulateGet('commitment', agentAddress),
      this.simulateGet('spend_limit', agentAddress),
      this.simulateGet('window_id', agentAddress),
    ]);
    return {
      commitment: commitment ? bytesToHex(commitment as Uint8Array) : null,
      spendLimit: spendLimit as bigint | null,
      windowId: windowId as bigint | null,
    };
  }

  private async simulateGet(key: string, agentAddress: string): Promise<unknown> {
    const dummySource = new Account(
      'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      '0',
    );
    const tx = this.buildTx(dummySource, `get_${key}`, [
      Address.fromString(agentAddress).toScVal(),
    ]);

    try {
      const sim = await this.server.simulateTransaction(tx);
      if ('error' in sim) return null;
      if (!sim.result?.retval) return null;
      return scValToNative(sim.result.retval);
    } catch {
      return null;
    }
  }

  private buildTx(
    source: Account,
    method: string,
    args: xdr.ScVal[],
  ) {
    return new TransactionBuilder(source, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(Operation.invokeContractFunction({
        contract: this.contractId,
        function: method,
        args,
      }))
      .setTimeout(30)
      .build();
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return '0x' + Buffer.from(bytes).toString('hex');
}
