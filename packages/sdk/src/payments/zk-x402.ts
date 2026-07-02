import { X402PaymentRequest, X402PaymentResult } from '../types';
import { AgentWallet } from '../wallet';
import { ZKPolicyEngine } from '../zk-policy-engine';
import { PolicyError } from '../agent';

const MXM_DECIMALS = 7;
const MXM_UNIT = 10n ** BigInt(MXM_DECIMALS);

export class ZKX402PaymentHandler {
  private wallet: AgentWallet;
  private zkEngine: ZKPolicyEngine;

  constructor(wallet: AgentWallet, zkEngine: ZKPolicyEngine) {
    this.wallet = wallet;
    this.zkEngine = zkEngine;
  }

  async pay(request: X402PaymentRequest): Promise<X402PaymentResult> {
    const maxRetries = request.maxRetries ?? 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const res = await fetch(request.url, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          ...request.headers,
        },
        body: request.body ? JSON.stringify(request.body) : undefined,
      });

      if (res.status === 200) {
        const data = await res.json();
        return {
          success: true,
          data,
          cost: 0,
          transactionId: crypto.randomUUID(),
        };
      }

      if (res.status === 402) {
        const paymentRequired = res.headers.get('PAYMENT-REQUIRED');
        if (!paymentRequired) {
          throw new Error('Received 402 without PAYMENT-REQUIRED header');
        }

        const paymentPayload = this.parsePaymentRequired(paymentRequired);

        const amountUnits = this.mxmToUnits(paymentPayload.amount);
        const state = await this.zkEngine.getOnChainState();
        if (!state.spendLimit) {
          throw new Error('Agent not registered on-chain — call ZKSubmitter.register() first');
        }

        const decision = await this.zkEngine.evaluateZK(amountUnits, state.spendLimit);
        if (!decision.allowed) {
          throw new PolicyError(decision.reason);
        }

        const txHash = await this.wallet.sendMXM(paymentPayload.payTo, paymentPayload.amount);
        const signatureHeader = this.buildPaymentSignature(paymentPayload, txHash);

        const retryRes = await fetch(request.url, {
          method: request.method,
          headers: {
            'Content-Type': 'application/json',
            'PAYMENT-SIGNATURE': signatureHeader,
            ...request.headers,
          },
          body: request.body ? JSON.stringify(request.body) : undefined,
        });

        if (retryRes.ok) {
          const data = await retryRes.json();
          return {
            success: true,
            data,
            cost: 0,
            transactionId: crypto.randomUUID(),
            txHash,
          };
        }
      }

      if (attempt < maxRetries) {
        await this.delay(1000 * (attempt + 1));
      }
    }

    return {
      success: false,
      cost: 0,
      transactionId: crypto.randomUUID(),
    };
  }

  private parsePaymentRequired(header: string): {
    network: string;
    asset: string;
    amount: string;
    payTo: string;
  } {
    const decoded = JSON.parse(Buffer.from(header, 'base64').toString('utf-8'));
    const accept = decoded.accepts?.[0];
    if (!accept) {
      throw new Error('No payment options in PAYMENT-REQUIRED');
    }
    return {
      network: accept.network,
      asset: accept.asset,
      amount: accept.amount,
      payTo: accept.payTo,
    };
  }

  private buildPaymentSignature(
    payload: { network: string; asset: string; amount: string; payTo: string },
    txHash?: string,
  ): string {
    const signaturePayload = {
      x402Version: 2,
      accepted: {
        scheme: 'exact',
        network: payload.network,
        amount: payload.amount,
        asset: payload.asset,
        payTo: payload.payTo,
      },
      payload: {
        signature: txHash ? `${txHash}` : '0x',
        authorization: {
          from: this.wallet.address,
          to: payload.payTo,
          value: payload.amount,
          validAfter: Math.floor(Date.now() / 1000).toString(),
          validBefore: (Math.floor(Date.now() / 1000) + 60).toString(),
          nonce: '0x' + crypto.randomUUID().replace(/-/g, ''),
        },
      },
    };
    return Buffer.from(JSON.stringify(signaturePayload)).toString('base64');
  }

  private mxmToUnits(mxmStr: string): bigint {
    const [whole, frac] = mxmStr.split('.');
    const w = BigInt(whole || '0');
    const f = frac
      ? BigInt(frac.padEnd(MXM_DECIMALS, '0').slice(0, MXM_DECIMALS))
      : 0n;
    return w * MXM_UNIT + f;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
