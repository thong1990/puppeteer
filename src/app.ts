import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { apiReference, Scalar } from '@scalar/hono-api-reference';

// Import route modules
import healthRouter from './routes/health';
import accountsRouter from './routes/accounts';
import otpGetRouter from './routes/otp';
import transferRouter from './routes/transfer';

const app = new OpenAPIHono();

// Middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Mount route modules
app.route('/', healthRouter);
app.route('/', accountsRouter);
app.route('/', otpGetRouter);
app.route('/', transferRouter);

// OpenAPI documentation endpoint
app.doc('/openapi.json', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'Email OTP Retrieval API',
    description: 'API for retrieving OTP codes from email accounts using IMAP and reference codes',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    }
  ]
});

// Scalar API documentation
app.get('/docs', Scalar({ url: '/openapi.json', theme: "elysiajs"  }));

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