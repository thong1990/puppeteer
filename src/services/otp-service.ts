import { ImapFlow } from 'imapflow';
import { EmailAccount, OTPRequest, OTPResponse } from '../types/gmail';
import { getActiveAccounts, getAccountById } from '../config/email-accounts';

export class OTPService {
  private static instance: OTPService;

  public static getInstance(): OTPService {
    if (!OTPService.instance) {
      OTPService.instance = new OTPService();
    }
    return OTPService.instance;
  }

  /**
   * Extract OTP from email content using reference code
   */
  private extractOTP(emailSource: string, referenceCode: string): string | null {
    try {
      // Look for the reference code in the content
      if (!emailSource.includes(referenceCode)) {
        return null;
      }

      // Common OTP patterns (6 digits, 4 digits, or alphanumeric)
      const otpPatterns = [
        /\b\d{6}\b/g,           // 6 digit OTP
        /\b\d{4}\b/g,           // 4 digit OTP
        /\b[A-Z0-9]{5,8}\b/g,   // Alphanumeric OTP
      ];

      for (const pattern of otpPatterns) {
        const matches = emailSource.match(pattern);
        if (matches) {
          // Return the first match found after the reference code
          const refIndex = emailSource.indexOf(referenceCode);
          const afterRef = emailSource.substring(refIndex);
          const otpMatches = afterRef.match(pattern);
          if (otpMatches) {
            return otpMatches[0];
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting OTP from email:', error);
      return null;
    }
  }

  /**
   * Search for OTP in a single email account using IMAP
   */
  private async searchOTPInAccount(
    account: EmailAccount, 
    referenceCode: string, 
    timeout: number = 30000
  ): Promise<OTPResponse> {
    let client: ImapFlow | null = null;
    
    try {
      const { credentials } = account;
      
      // Create IMAP client
      client = new ImapFlow({
        host: credentials.host,
        port: credentials.port,
        secure: credentials.secure,
        auth: credentials.auth,
        logger: false // Disable logging for production
      });

      // Connect to IMAP server
      await client.connect();

      // Get mailbox lock for INBOX
      const lock = await client.getMailboxLock('INBOX');
      
      try {
        // Search for recent emails (last 10 minutes)
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const searchQuery = {
          since: tenMinutesAgo
        };

        // Get messages matching the search criteria
        const messages = [];
        for await (const message of client.fetch(searchQuery, { 
          source: true,
          envelope: true 
        })) {
          messages.push(message);
        }

        // Search through messages for reference code and OTP
        for (const message of messages) {
          const emailSource = message.source?.toString() || '';
          
          if (emailSource.includes(referenceCode)) {
            const otp = this.extractOTP(emailSource, referenceCode);
            
            if (otp) {
              return {
                success: true,
                otp,
                accountId: account.id,
                email: account.credentials.email,
                timestamp: new Date().toISOString()
              };
            }
          }
        }

        return {
          success: false,
          error: `No OTP found for reference code: ${referenceCode}`,
          accountId: account.id,
          email: account.credentials.email,
          timestamp: new Date().toISOString()
        };

      } finally {
        lock.release();
      }

    } catch (error) {
      return {
        success: false,
        error: `Error searching account ${account.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        accountId: account.id,
        email: account.credentials.email,
        timestamp: new Date().toISOString()
      };
    } finally {
      // Always close the connection
      if (client) {
        try {
          await client.logout();
        } catch (error) {
          console.error('Error closing IMAP connection:', error);
        }
      }
    }
  }

  /**
   * Search for OTP with timeout wrapper
   */
  private async searchWithTimeout(
    account: EmailAccount,
    referenceCode: string,
    timeout: number
  ): Promise<OTPResponse> {
    return Promise.race([
      this.searchOTPInAccount(account, referenceCode, timeout),
      new Promise<OTPResponse>((_, reject) =>
        setTimeout(() => reject(new Error('Search timeout')), timeout)
      )
    ]).catch((error) => ({
      success: false,
      error: `Timeout or error searching account ${account.id}: ${error.message}`,
      accountId: account.id,
      email: account.credentials.email,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Retrieve OTP by reference code from multiple email accounts
   */
  public async getOTP(request: OTPRequest): Promise<OTPResponse> {
    const { referenceCode, accountIds, timeout = 30000 } = request;

    if (!referenceCode || referenceCode.length !== 5) {
      return {
        success: false,
        error: 'Reference code must be exactly 5 characters',
        timestamp: new Date().toISOString()
      };
    }

    // Get accounts to search
    let accountsToSearch: EmailAccount[];
    
    if (accountIds && accountIds.length > 0) {
      // Search specific accounts
      accountsToSearch = accountIds
        .map(id => getAccountById(id))
        .filter((account): account is EmailAccount => account !== undefined && account.isActive);
    } else {
      // Search all active accounts
      accountsToSearch = getActiveAccounts();
    }

    if (accountsToSearch.length === 0) {
      return {
        success: false,
        error: 'No active email accounts found',
        timestamp: new Date().toISOString()
      };
    }

    // Search all accounts in parallel
    const searchPromises = accountsToSearch.map(account => 
      this.searchWithTimeout(account, referenceCode, timeout)
    );

    try {
      const results = await Promise.allSettled(searchPromises);
      
      // Find the first successful result
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.success) {
          return result.value;
        }
      }

      // If no success, return the first error or a generic message
      const firstError = results.find(r => r.status === 'fulfilled')?.value;
      
      return firstError || {
        success: false,
        error: 'Failed to retrieve OTP from any account',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }
}