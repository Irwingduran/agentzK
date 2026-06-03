export type ApiResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  code: string;
};

export interface ApiError {
  message: string;
  code: string;
  status: number;
}

export class ApiServiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiServiceError';
    this.code = code;
    this.status = status;
  }
}

export function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function fail(error: string, code: string): ApiResponse<never> {
  return { success: false, error, code };
}

export type { AgentXConfig, NetworkId, NetworkConfig } from '@open402/agents';
