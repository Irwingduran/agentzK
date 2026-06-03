import { BillPaymentRequest, BillPaymentResult, BillService } from '../types';
import { ApiClient } from '../client/api-client';

const SERVICE_NAMES: Record<BillService, string> = {
  cfe: 'CFE',
  telmex: 'Telmex',
  telcel: 'Telcel',
  izzi: 'Izzi',
};

export class BillPaymentHandler {
  private client: ApiClient;
  private agentId: string;

  constructor(client: ApiClient, agentId: string) {
    this.client = client;
    this.agentId = agentId;
  }

  async pay(request: BillPaymentRequest): Promise<BillPaymentResult> {
    this.validate(request);

    const result = await this.client.payBill(this.agentId, request);
    return result;
  }

  private validate(request: BillPaymentRequest): void {
    if (!request.reference || request.reference.trim().length === 0) {
      throw new Error(`Reference is required for ${SERVICE_NAMES[request.service]} payments`);
    }

    if (request.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (request.amount > 50000) {
      throw new Error('Amount exceeds maximum of 50,000 MXN');
    }
  }
}
