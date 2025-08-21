import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { getOTP } from './services/otp-service';
import { getActiveAccounts } from './config/email-accounts';
import type { OTPRequest } from './types/gmail';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    status: 'OK',
    message: 'Email OTP Retrieval API (IMAP)',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Get active email accounts (without credentials)
app.get('/accounts', (c) => {
  const accounts = getActiveAccounts();
  
  return c.json({
    success: true,
    accounts: accounts.map(account => ({
      id: account.id,
      email: account.credentials.email,
      isActive: account.isActive
    })),
    count: accounts.length
  });
});

// Retrieve OTP by reference code
app.post('/otp', async (c) => {
  try {
    const body: OTPRequest = await c.req.json();
    
    if (!body.referenceCode) {
      return c.json({
        success: false,
        error: 'Reference code is required',
        timestamp: new Date().toISOString()
      }, 400);
    }

    if (body.referenceCode.length !== 5) {
      return c.json({
        success: false,
        error: 'Reference code must be exactly 5 characters',
        timestamp: new Date().toISOString()
      }, 400);
    }

    const result = await getOTP(body);
    
    return c.json(result, result.success ? 200 : 404);

  } catch (error) {
    console.error('Error processing OTP request:', error);
    
    return c.json({
      success: false,
      error: 'Invalid request format',
      timestamp: new Date().toISOString()
    }, 400);
  }
});

// Get OTP with GET request (for simpler testing)
app.get('/otp/:referenceCode', async (c) => {
  const referenceCode = c.req.param('referenceCode');
  const accountIds = c.req.query('accounts')?.split(',');
  const timeout = c.req.query('timeout') ? parseInt(c.req.query('timeout')!) : undefined;

  if (!referenceCode) {
    return c.json({
      success: false,
      error: 'Reference code is required',
      timestamp: new Date().toISOString()
    }, 400);
  }

  if (referenceCode.length !== 5) {
    return c.json({
      success: false,
      error: 'Reference code must be exactly 5 characters',
      timestamp: new Date().toISOString()
    }, 400);
  }

  const result = await getOTP({
    referenceCode,
    accountIds,
    timeout
  });

  return c.json(result, result.success ? 200 : 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Application error:', err);
  return c.json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  }, 500);
});

export default app;