import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import type { EmailAccount, OTPRequest, OTPResponse } from '../types/gmail';
import { getActiveAccounts, getAccountById } from '../config/email-accounts';

/**
 * Extract OTP from email content using reference code
 */
function extractOTP(emailSource: string, referenceCode: string): string | null {
  try {
    // Look for the reference code in the content
    if (!emailSource.includes(referenceCode)) {
      return null;
    }

    // First try to find Thai bank specific OTP pattern
    const thaiOtpPatterns = [
      /รหัส\s*OTP\s*[:：]\s*(\d{4,8})/i,     // Thai: รหัส OTP : 123456
      /OTP\s*code\s*[:：]\s*(\d{4,8})/i,     // English: OTP code: 123456
      /verification\s*code\s*[:：]\s*(\d{4,8})/i // verification code: 123456
    ];

    for (const pattern of thaiOtpPatterns) {
      const match = emailSource.match(pattern);
      if (match?.[1]) {
        return match[1];
      }
    }

    // Fallback to generic patterns but search near reference code
    const refIndex = emailSource.indexOf(referenceCode);
    if (refIndex !== -1) {
      // Look within 200 characters before and after the reference code
      const contextStart = Math.max(0, refIndex - 200);
      const contextEnd = Math.min(emailSource.length, refIndex + 200);
      const context = emailSource.substring(contextStart, contextEnd);

      // Generic OTP patterns in context
      const genericPatterns = [
        /\b\d{6}\b/g,           // 6 digit OTP
        /\b\d{4}\b/g,           // 4 digit OTP
        /\b[A-Z0-9]{5,8}\b/g,   // Alphanumeric OTP
      ];

      for (const pattern of genericPatterns) {
        const matches = context.match(pattern);
        if (matches) {
          // Filter out common non-OTP numbers and the reference code itself
          for (const match of matches) {
            // Skip years (2020-2030), phone numbers, reference code itself
            if (!/^(20[2-3]\d|02-|1\d{10})/.test(match) && match !== referenceCode) {
              return match;
            }
          }
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
async function searchOTPInAccount(
  account: EmailAccount, 
  referenceCode: string
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
      const messages: any[] = [];
      for await (const message of client.fetch(searchQuery, { 
        source: true,
        envelope: true 
      })) {
        messages.push(message);
      }

      // Search through messages for reference code and OTP
      for (const message of messages) {
        const emailSource = message.source?.toString() || '';
        let emailContent = '';
        
        try {
          // Use mailparser to properly parse the email
          const parsed = await simpleParser(emailSource);
          
          // Get text content from parsed email
          if (parsed.text) {
            emailContent = parsed.text;
          } else if (parsed.html) {
            // If no text, use HTML and strip tags
            emailContent = parsed.html
              .replace(/<[^>]*>/g, ' ')
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/\s+/g, ' ')
              .trim();
          }
        } catch (error) {
          console.log('Mail parsing failed, using fallback:', error);
          // Fallback to searching the entire source
          emailContent = emailSource;
        }
        
        
        if (emailContent.includes(referenceCode)) {
          const otp = extractOTP(emailContent, referenceCode);
          
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
async function searchWithTimeout(
  account: EmailAccount,
  referenceCode: string,
  timeout: number
): Promise<OTPResponse> {
  return Promise.race([
    searchOTPInAccount(account, referenceCode),
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
 * Validate OTP request parameters
 */
function validateOTPRequest(request: OTPRequest): { isValid: boolean; error?: string } {
  const { referenceCode } = request;

  if (!referenceCode || referenceCode.length !== 5) {
    return {
      isValid: false,
      error: 'Reference code must be exactly 5 characters'
    };
  }

  return { isValid: true };
}

/**
 * Get accounts to search based on request parameters
 */
function getAccountsToSearch(accountIds?: string[]): EmailAccount[] {
  if (accountIds && accountIds.length > 0) {
    // Search specific accounts
    return accountIds
      .map(id => getAccountById(id))
      .filter((account): account is EmailAccount => account?.isActive === true);
  } else {
    // Search all active accounts
    return getActiveAccounts();
  }
}

/**
 * Find first successful result from parallel search results
 */
function findSuccessfulResult(results: PromiseSettledResult<OTPResponse>[]): OTPResponse {
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
}

/**
 * Retrieve OTP by reference code from multiple email accounts
 */
export async function getOTP(request: OTPRequest): Promise<OTPResponse> {
  const { referenceCode, accountIds, timeout = 30000 } = request;

  // Validate request
  const validation = validateOTPRequest(request);
  if (!validation.isValid) {
    return {
      success: false,
      error: validation.error || 'Validation failed',
      timestamp: new Date().toISOString()
    };
  }

  // Get accounts to search
  const accountsToSearch = getAccountsToSearch(accountIds);

  if (accountsToSearch.length === 0) {
    return {
      success: false,
      error: 'No active email accounts found',
      timestamp: new Date().toISOString()
    };
  }

  // Search all accounts in parallel
  const searchPromises = accountsToSearch.map(account => 
    searchWithTimeout(account, referenceCode, timeout)
  );

  try {
    const results = await Promise.allSettled(searchPromises);
    return findSuccessfulResult(results);
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    };
  }
}

// Export individual functions for testing
export {
  extractOTP,
  searchOTPInAccount,
  searchWithTimeout,
  validateOTPRequest,
  getAccountsToSearch,
  findSuccessfulResult
};