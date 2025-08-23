import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';
import puppeteer from 'puppeteer';

// Response schema for transfer operation
const transferResponseSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  message: z.string().openapi({ example: 'Transfer script executed successfully' }),
  timestamp: z.string().openapi({ example: '2025-08-22T10:00:00.000Z' })
});

// Error response schema
const errorResponseSchema = z.object({
  success: z.boolean().openapi({ example: false }),
  error: z.string().openapi({ example: 'Transfer script failed' }),
  timestamp: z.string().openapi({ example: '2025-08-22T10:00:00.000Z' })
});

// Transfer route definition
const transferRoute = createRoute({
  method: 'post',
  path: '/transfer',
  summary: 'Execute Transfer Script',
  description: 'Execute a Puppeteer script for transfer operations',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: transferResponseSchema
        }
      },
      description: 'Transfer script executed successfully'
    },
    500: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Transfer script execution failed'
    }
  },
  tags: ['Transfer']
});

// Create router instance
const transferRouter = new OpenAPIHono();

// Transfer endpoint
transferRouter.openapi(transferRoute, async (c) => {
  try {
    // Launch browser
    const browser = await puppeteer.connect({
      browserWSEndpoint: 'wss://production-sfo.browserless.io/?token=2SuhfoH4tsTcYWE716de748d4ce09f80a6cd65e0f819e9f76',
    })
    
    const page = await browser.newPage();

    
    // Example Puppeteer script - you can modify this as needed
    await page.goto('https://google.com');
    
    // Add your transfer logic here
    // For example:
    // await page.type('#username', 'your-username');
    // await page.type('#password', 'your-password');
    // await page.click('#login-button');
    // await page.waitForNavigation();
    
    // Get page title as a simple example
    const title = await page.title();
    console.log('Page title:', title);
    
    await browser.close();

    // --- END OF PUPPETEER SCRIPT ---
    
    return c.json({
      success: true,
      message: 'Transfer script executed successfully',
      timestamp: new Date().toISOString()
    }, 200);
    
  } catch (error) {
    console.error('Transfer script error:', error);
    
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

export default transferRouter;