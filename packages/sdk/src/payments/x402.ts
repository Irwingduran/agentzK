import { X402PaymentRequest, X402PaymentResult, NetworkConfig } from '../types';
import { AgentWallet } from '../wallet';

export class X402PaymentHandler {
  private wallet: AgentWallet;

  constructor(wallet: AgentWallet) {
    this.wallet = wallet;
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
        const cost = this.extractCost(res);
        return {
          success: true,
          data,
          cost,
          transactionId: crypto.randomUUID(),
        };
      }

      if (res.status === 402) {
        const paymentRequired = res.headers.get('PAYMENT-REQUIRED');
        if (!paymentRequired) {
          throw new Error('Received 402 without PAYMENT-REQUIRED header');
        }

        const paymentPayload = this.parsePaymentRequired(paymentRequired);

        const txHash = await this.executePayment(paymentPayload);

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
          const cost = this.extractCost(retryRes);
          return {
            success: true,
            data,
            cost,
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

  private async executePayment(payload: {
    network: string;
    asset: string;
    amount: string;
    payTo: string;
  }): Promise<string | undefined> {
    const txHash = await this.wallet.sendMXM(payload.payTo, payload.amount);
    return txHash;
  }

  private buildPaymentSignature(
    payload: { network: string; asset: string; amount: string; payTo: string },
    txHash?: string
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

  private extractCost(res: Response): number {
    const paymentResponse = res.headers.get('PAYMENT-RESPONSE');
    return paymentResponse ? 0 : 0;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
