export interface ImapCredentials {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  email: string;
}

export interface EmailAccount {
  id: string;
  credentials: ImapCredentials;
  isActive: boolean;
}

export interface OTPRequest {
  referenceCode: string;
  accountIds?: string[]; // If not provided, search all active accounts
  timeout?: number;
}

export interface OTPResponse {
  success: boolean;
  otp?: string;
  accountId?: string;
  email?: string;
  error?: string;
  timestamp: string;
}