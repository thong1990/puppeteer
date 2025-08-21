import type { EmailAccount } from '../types/gmail';

// Example configuration - in production, this should be loaded from environment variables or a secure config file
export const emailAccounts: EmailAccount[] = [
  {
    id: 'account1',
    credentials: {
      host: process.env.IMAP_HOST_1 || 'imap.gmail.com',
      port: parseInt(process.env.IMAP_PORT_1 || '993'),
      secure: (process.env.IMAP_SECURE_1 || 'true') === 'true',
      auth: {
        user: process.env.EMAIL_USER_1 || '',
        pass: process.env.EMAIL_PASS_1 || '',
      },
      email: process.env.EMAIL_USER_1 || '',
    },
    isActive: true,
  },
  {
    id: 'account2',
    credentials: {
      host: process.env.IMAP_HOST_2 || 'imap.gmail.com',
      port: parseInt(process.env.IMAP_PORT_2 || '993'),
      secure: (process.env.IMAP_SECURE_2 || 'true') === 'true',
      auth: {
        user: process.env.EMAIL_USER_2 || '',
        pass: process.env.EMAIL_PASS_2 || '',
      },
      email: process.env.EMAIL_USER_2 || '',
    },
    isActive: true,
  },
  // Add more accounts as needed
];

export function getActiveAccounts(): EmailAccount[] {
  return emailAccounts.filter(account => 
    account.isActive && 
    account.credentials.auth.user && 
    account.credentials.auth.pass
  );
}

export function getAccountById(accountId: string): EmailAccount | undefined {
  return emailAccounts.find(account => account.id === accountId);
}

// Common IMAP configurations for popular providers
export const imapConfigs = {
  gmail: {
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
  },
  outlook: {
    host: 'outlook.office365.com',
    port: 993,
    secure: true,
  },
  yahoo: {
    host: 'imap.mail.yahoo.com',
    port: 993,
    secure: true,
  },
  apple: {
    host: 'imap.mail.me.com',
    port: 993,
    secure: true,
  },
};