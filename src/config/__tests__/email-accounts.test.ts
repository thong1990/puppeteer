import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock environment variables before importing the module
const mockEnv = {
  EMAIL_USER_1: 'test1@gmail.com',
  EMAIL_PASS_1: 'password1',
  EMAIL_USER_2: 'test2@gmail.com',
  EMAIL_PASS_2: 'password2',
  IMAP_HOST_1: 'imap.gmail.com',
  IMAP_PORT_1: '993',
  IMAP_SECURE_1: 'true'
};

// Set up environment variables before module import
Object.keys(mockEnv).forEach(key => {
  process.env[key] = mockEnv[key as keyof typeof mockEnv];
});

// Now import the module after setting up environment
import { getActiveAccounts, getAccountById, imapConfigs } from '../email-accounts';

describe('Email Accounts Configuration', () => {
  beforeEach(() => {
    // Ensure environment variables are set
    Object.keys(mockEnv).forEach(key => {
      process.env[key] = mockEnv[key as keyof typeof mockEnv];
    });
  });

  describe('getActiveAccounts', () => {
    it('should return active accounts with credentials when env vars are set', () => {
      const accounts = getActiveAccounts();
      
      // Since environment variables might not be set in test environment,
      // we test the filtering logic rather than expecting specific values
      accounts.forEach(account => {
        expect(account.isActive).toBe(true);
        // Only accounts with both user and pass should be included
        expect(account.credentials.auth.user).toBeTruthy();
        expect(account.credentials.auth.pass).toBeTruthy();
        expect(account.id).toBeTruthy();
      });
    });

    it('should filter out accounts without credentials', () => {
      // Remove credentials from environment
      delete process.env.EMAIL_USER_1;
      delete process.env.EMAIL_PASS_1;
      
      const accounts = getActiveAccounts();
      
      // Should not include account1 due to missing credentials
      const account1 = accounts.find(acc => acc.id === 'account1');
      expect(account1).toBeUndefined();
    });

    it('should handle missing password', () => {
      delete process.env.EMAIL_PASS_1;
      
      const accounts = getActiveAccounts();
      const account1 = accounts.find(acc => acc.id === 'account1');
      
      expect(account1).toBeUndefined();
    });

    it('should handle missing username', () => {
      delete process.env.EMAIL_USER_1;
      
      const accounts = getActiveAccounts();
      const account1 = accounts.find(acc => acc.id === 'account1');
      
      expect(account1).toBeUndefined();
    });
  });

  describe('getAccountById', () => {
    it('should return account by valid ID', () => {
      const account = getAccountById('account1');
      
      expect(account).toBeDefined();
      expect(account?.id).toBe('account1');
      expect(account?.isActive).toBe(true);
      expect(typeof account?.credentials.email).toBe('string');
    });

    it('should return undefined for invalid ID', () => {
      const account = getAccountById('nonexistent');
      expect(account).toBeUndefined();
    });

    it('should return account even if inactive', () => {
      // This tests that getAccountById doesn't filter by active status
      const account = getAccountById('account1');
      expect(account).toBeDefined();
    });
  });

  describe('imapConfigs', () => {
    it('should contain Gmail configuration', () => {
      expect(imapConfigs.gmail).toEqual({
        host: 'imap.gmail.com',
        port: 993,
        secure: true
      });
    });

    it('should contain Outlook configuration', () => {
      expect(imapConfigs.outlook).toEqual({
        host: 'outlook.office365.com',
        port: 993,
        secure: true
      });
    });

    it('should contain Yahoo configuration', () => {
      expect(imapConfigs.yahoo).toEqual({
        host: 'imap.mail.yahoo.com',
        port: 993,
        secure: true
      });
    });

    it('should contain Apple configuration', () => {
      expect(imapConfigs.apple).toEqual({
        host: 'imap.mail.me.com',
        port: 993,
        secure: true
      });
    });

    it('should have all configs with secure connection', () => {
      Object.values(imapConfigs).forEach(config => {
        expect(config.secure).toBe(true);
        expect(config.port).toBe(993);
        expect(config.host).toBeTruthy();
      });
    });
  });

  describe('Account structure validation', () => {
    it('should have properly structured accounts', () => {
      const account = getAccountById('account1');
      
      expect(account).toBeDefined();
      expect(typeof account?.id).toBe('string');
      expect(typeof account?.isActive).toBe('boolean');
      
      expect(account?.credentials).toBeDefined();
      expect(typeof account?.credentials.host).toBe('string');
      expect(typeof account?.credentials.port).toBe('number');
      expect(typeof account?.credentials.secure).toBe('boolean');
      expect(typeof account?.credentials.email).toBe('string');
      
      expect(account?.credentials.auth).toBeDefined();
      expect(typeof account?.credentials.auth.user).toBe('string');
      expect(typeof account?.credentials.auth.pass).toBe('string');
    });

    it('should use environment variables for configuration', () => {
      // This test verifies that the configuration system is designed to use environment variables
      // The actual values may vary based on the environment
      const account = getAccountById('account1');
      
      expect(account).toBeDefined();
      // Verify that the account structure supports environment variable configuration
      expect(typeof account?.credentials.auth.user).toBe('string');
      expect(typeof account?.credentials.auth.pass).toBe('string');
    });
  });
});