import type { GmailAccount } from '../types/gmail';

// Example configuration - in production, this should be loaded from environment variables or a secure config file
export const gmailAccounts: GmailAccount[] = [
  {
    id: 'account1',
    credentials: {
      clientId: process.env.GMAIL_CLIENT_ID_1 || '',
      clientSecret: process.env.GMAIL_CLIENT_SECRET_1 || '',
      refreshToken: process.env.GMAIL_REFRESH_TOKEN_1 || '',
      email: process.env.GMAIL_EMAIL_1 || '',
    },
    isActive: true,
  },
  {
    id: 'account2',
    credentials: {
      clientId: process.env.GMAIL_CLIENT_ID_2 || '',
      clientSecret: process.env.GMAIL_CLIENT_SECRET_2 || '',
      refreshToken: process.env.GMAIL_REFRESH_TOKEN_2 || '',
      email: process.env.GMAIL_EMAIL_2 || '',
    },
    isActive: true,
  },
  // Add more accounts as needed
];

export function getActiveAccounts(): GmailAccount[] {
  return gmailAccounts.filter(account => 
    account.isActive && 
    account.credentials.clientId && 
    account.credentials.clientSecret && 
    account.credentials.refreshToken
  );
}

export function getAccountById(accountId: string): GmailAccount | undefined {
  return gmailAccounts.find(account => account.id === accountId);
}