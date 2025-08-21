import { describe, it, expect, vi } from 'vitest';
import {
  extractOTP,
  validateOTPRequest,
  getAccountsToSearch,
  findSuccessfulResult,
  getOTP
} from '../otp-service';
import type { EmailAccount, OTPRequest, OTPResponse } from '../../types/gmail';

// Mock the email-accounts module
vi.mock('../../config/email-accounts', () => ({
  getActiveAccounts: vi.fn(() => [
    {
      id: 'account1',
      credentials: {
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
        auth: { user: 'test1@gmail.com', pass: 'pass1' },
        email: 'test1@gmail.com'
      },
      isActive: true
    },
    {
      id: 'account2',
      credentials: {
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
        auth: { user: 'test2@gmail.com', pass: 'pass2' },
        email: 'test2@gmail.com'
      },
      isActive: true
    }
  ]),
  getAccountById: vi.fn((id: string) => {
    const accounts = [
      {
        id: 'account1',
        credentials: {
          host: 'imap.gmail.com',
          port: 993,
          secure: true,
          auth: { user: 'test1@gmail.com', pass: 'pass1' },
          email: 'test1@gmail.com'
        },
        isActive: true
      },
      {
        id: 'inactive',
        credentials: {
          host: 'imap.gmail.com',
          port: 993,
          secure: true,
          auth: { user: 'inactive@gmail.com', pass: 'pass' },
          email: 'inactive@gmail.com'
        },
        isActive: false
      }
    ];
    return accounts.find(account => account.id === id);
  })
}));

describe('OTP Service', () => {
  describe('extractOTP', () => {
    it('should extract Thai OTP pattern', () => {
      const emailContent = 'รหัส OTP: 123456 สำหรับการทำธุรกรรม ABC12';
      const result = extractOTP(emailContent, 'ABC12');
      expect(result).toBe('123456');
    });

    it('should extract English OTP pattern', () => {
      const emailContent = 'Your OTP code: 789012 for reference ABC12';
      const result = extractOTP(emailContent, 'ABC12');
      expect(result).toBe('789012');
    });

    it('should extract verification code pattern', () => {
      const emailContent = 'Your verification code: 456789 ref: ABC12';
      const result = extractOTP(emailContent, 'ABC12');
      expect(result).toBe('456789');
    });

    it('should extract generic 6-digit pattern near reference code', () => {
      const emailContent = 'Transaction ABC12 requires code 123456 to complete';
      const result = extractOTP(emailContent, 'ABC12');
      expect(result).toBe('123456');
    });

    it('should extract generic 4-digit pattern near reference code', () => {
      const emailContent = 'Please use 1234 to verify transaction ABC12';
      const result = extractOTP(emailContent, 'ABC12');
      expect(result).toBe('1234');
    });

    it('should return null when reference code not found', () => {
      const emailContent = 'Your OTP code: 123456';
      const result = extractOTP(emailContent, 'NOTFOUND');
      expect(result).toBeNull();
    });

    it('should return null when no OTP pattern found', () => {
      const emailContent = 'Reference ABC12 found but no valid OTP here';
      const result = extractOTP(emailContent, 'ABC12');
      expect(result).toBeNull();
    });

    it('should skip year patterns', () => {
      const emailContent = 'Transaction ABC12 from 2023 with code 123456';
      const result = extractOTP(emailContent, 'ABC12');
      expect(result).toBe('123456'); // Should get OTP, not year
    });

    it('should handle alphanumeric OTP', () => {
      const emailContent = 'Use code ABC123 for transaction ABC12';
      const result = extractOTP(emailContent, 'ABC12');
      expect(result).toBe('ABC123');
    });
  });

  describe('validateOTPRequest', () => {
    it('should validate correct request', () => {
      const request: OTPRequest = { referenceCode: 'ABC12' };
      const result = validateOTPRequest(request);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty reference code', () => {
      const request: OTPRequest = { referenceCode: '' };
      const result = validateOTPRequest(request);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Reference code must be exactly 5 characters');
    });

    it('should reject reference code with wrong length', () => {
      const request: OTPRequest = { referenceCode: 'ABCD' };
      const result = validateOTPRequest(request);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Reference code must be exactly 5 characters');
    });

    it('should reject reference code that is too long', () => {
      const request: OTPRequest = { referenceCode: 'ABCDEF' };
      const result = validateOTPRequest(request);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Reference code must be exactly 5 characters');
    });
  });

  describe('getAccountsToSearch', () => {
    it('should return all active accounts when no accountIds specified', () => {
      const result = getAccountsToSearch();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('account1');
      expect(result[1].id).toBe('account2');
    });

    it('should return specific accounts when accountIds specified', () => {
      const result = getAccountsToSearch(['account1']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('account1');
    });

    it('should filter out inactive accounts', () => {
      const result = getAccountsToSearch(['account1', 'inactive']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('account1');
    });

    it('should return empty array for non-existent accounts', () => {
      const result = getAccountsToSearch(['nonexistent']);
      expect(result).toHaveLength(0);
    });
  });

  describe('findSuccessfulResult', () => {
    it('should return first successful result', () => {
      const results: PromiseSettledResult<OTPResponse>[] = [
        { status: 'fulfilled', value: { success: false, error: 'Error', timestamp: '2023-01-01T00:00:00Z' } },
        { status: 'fulfilled', value: { success: true, otp: '123456', timestamp: '2023-01-01T00:00:00Z' } },
        { status: 'fulfilled', value: { success: true, otp: '789012', timestamp: '2023-01-01T00:00:00Z' } }
      ];

      const result = findSuccessfulResult(results);
      expect(result.success).toBe(true);
      expect(result.otp).toBe('123456');
    });

    it('should return first error when no successful results', () => {
      const results: PromiseSettledResult<OTPResponse>[] = [
        { status: 'fulfilled', value: { success: false, error: 'First error', timestamp: '2023-01-01T00:00:00Z' } },
        { status: 'fulfilled', value: { success: false, error: 'Second error', timestamp: '2023-01-01T00:00:00Z' } }
      ];

      const result = findSuccessfulResult(results);
      expect(result.success).toBe(false);
      expect(result.error).toBe('First error');
    });

    it('should return generic error when all results are rejected', () => {
      const results: PromiseSettledResult<OTPResponse>[] = [
        { status: 'rejected', reason: new Error('Connection failed') }
      ];

      const result = findSuccessfulResult(results);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to retrieve OTP from any account');
    });
  });

  describe('getOTP integration', () => {
    it('should reject invalid reference code', async () => {
      const request: OTPRequest = { referenceCode: 'ABC' };
      const result = await getOTP(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Reference code must be exactly 5 characters');
      expect(result.timestamp).toBeDefined();
    });

    it('should handle no active accounts', async () => {
      // Mock to return no active accounts
      const { getActiveAccounts } = await import('../../config/email-accounts');
      vi.mocked(getActiveAccounts).mockReturnValueOnce([]);

      const request: OTPRequest = { referenceCode: 'ABC12' };
      const result = await getOTP(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No active email accounts found');
    });
  });
});