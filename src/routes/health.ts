import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';

// Inline validation schema for health response
const healthResponseSchema = z.object({
  status: z.string().openapi({ example: 'OK' }),
  message: z.string().openapi({ example: 'Email OTP Retrieval API (IMAP)' }),
  version: z.string().openapi({ example: '1.0.0' }),
  timestamp: z.string().openapi({ example: '2025-08-22T10:00:00.000Z' })
});

// Health check route definition
const healthRoute = createRoute({
  method: 'get',
  path: '/',
  summary: 'Health Check',
  description: 'Check API health status',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: healthResponseSchema
        }
      },
      description: 'API is healthy'
    }
  },
  tags: ['Health']
});

// Create router instance
const healthRouter = new OpenAPIHono();

// Health check endpoint
healthRouter.openapi(healthRoute, (c) => {
  return c.json({
    status: 'OK',
    message: 'Email OTP Retrieval API (IMAP)',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

export default healthRouter;