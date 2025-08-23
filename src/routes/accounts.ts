import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';
import { getActiveAccounts } from '../config/email-accounts';

// Inline validation schema for accounts response
const accountsResponseSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  accounts: z.array(z.object({
    id: z.string().openapi({ example: 'account1' }),
    email: z.email().openapi({ example: 'user@example.com' }),
    isActive: z.boolean().openapi({ example: true })
  })),
  count: z.number().openapi({ example: 2 })
});

// Accounts route definition
const accountsRoute = createRoute({
  method: 'get',
  path: '/accounts',
  summary: 'Get Active Email Accounts',
  description: 'Retrieve all email accounts',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: accountsResponseSchema
        }
      },
      description: 'List of active accounts'
    }
  },
  tags: ['Accounts']
});

// Create router instance
const accountsRouter = new OpenAPIHono();

// Get active email accounts endpoint
accountsRouter.openapi(accountsRoute, (c) => {
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

export default accountsRouter;