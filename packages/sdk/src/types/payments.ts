export type BillService = 'cfe' | 'telmex' | 'telcel' | 'izzi';

export interface BillPaymentRequest {
  service: BillService;
  reference: string;
  amount: number;
}

export interface BillPaymentResult {
  success: boolean;
  transactionId: string;
  service: BillService;
  amount: number;
  fee: number;
  confirmationCode?: string;
}

export interface X402PaymentRequest {
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
  maxRetries?: number;
}

export interface X402PaymentResult {
  success: boolean;
  data?: unknown;
  cost: number;
  transactionId: string;
  txHash?: string;
}

export interface CreditPurchaseRequest {
  amountMXN: number;
  paymentMethod: 'card' | 'oxxo' | 'spei';
}

export interface CreditPurchaseResult {
  success: boolean;
  creditsAmount: number;
  mxnAmount: number;
  exchangeRate: number;
  transactionId: string;
}


