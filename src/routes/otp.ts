import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';
import { getOTP } from '../services/otp-service';

// Inline validation schemas
const referenceCodeParamSchema = z.object({
  referenceCode: z.string()
    .length(5, 'Reference code must be exactly 5 characters')
    .regex(/^[A-Za-z0-9]+$/, 'Reference code must contain only letters and numbers')
    .openapi({ param: { name: 'referenceCode', in: 'path' }, example: 'ABC12' })
});

const otpQuerySchema = z.object({
  accounts: z.string().optional().transform((val) => val?.split(','))
    .openapi({ param: { name: 'accounts', in: 'query' }, example: 'account1,account2' }),
  timeout: z.string().optional().transform((val) => val ? parseInt(val) : undefined)
    .openapi({ param: { name: 'timeout', in: 'query' }, example: '30000' })
});

const otpResponseSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  otp: z.string().optional().openapi({ example: '123456' }),
  accountId: z.string().optional().openapi({ example: 'account1' }),
  email: z.string().optional().openapi({ example: 'user@example.com' }),
  error: z.string().optional().openapi({ example: 'OTP not found' }),
  timestamp: z.string().openapi({ example: '2025-08-22T10:00:00.000Z' })
});

const errorResponseSchema = z.object({
  success: z.boolean().openapi({ example: false }),
  error: z.string().openapi({ example: 'Invalid request format' }),
  timestamp: z.string().openapi({ example: '2025-08-22T10:00:00.000Z' })
});

// GET OTP route definition
const getOtpRoute = createRoute({
  method: 'get',
  path: '/otp/{referenceCode}',
  summary: 'Get OTP with GET Request',
  description: 'Retrieve OTP using GET request for simpler testing',
  request: {
    params: referenceCodeParamSchema,
    query: otpQuerySchema
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: otpResponseSchema
        }
      },
      description: 'OTP found successfully'
    },
    404: {
      content: {
        'application/json': {
          schema: otpResponseSchema
        }
      },
      description: 'OTP not found'
    },
    400: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Invalid request'
    }
  },
  tags: ['OTP']
});

// Create router instance
const otpGetRouter = new OpenAPIHono();

// GET - Retrieve OTP with GET request
otpGetRouter.openapi(getOtpRoute, async (c) => {
  const { referenceCode } = c.req.valid('param');
  const { accounts: accountIds, timeout } = c.req.valid('query');

  const result = await getOTP({
    referenceCode,
    accountIds,
    timeout
  });

  return c.json(result, result.success ? 200 : 404);
});

export default otpGetRouter;