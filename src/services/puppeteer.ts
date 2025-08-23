import puppeteer from 'puppeteer';

export interface PuppeteerOptions {
  headless?: boolean;
  slowMo?: number;
  devtools?: boolean;
  viewport?: {
    width: number;
    height: number;
  };
}

export async function createBrowser(options: PuppeteerOptions = {}) {
  const defaultOptions = {
    headless: false,    // Show browser window
    slowMo: 250,        // Slow down operations to see them
    devtools: true,     // Auto-open DevTools
    ...options
  };

  return await puppeteer.launch(defaultOptions);
}

export async function createPage(browser: any, viewport?: { width: number; height: number }) {
  const page = await browser.newPage();
  
  if (viewport) {
    await page.setViewport(viewport);
  }
  
  return page;
}