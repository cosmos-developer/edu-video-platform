import puppeteer, { Browser, Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

interface ScreenshotOptions {
  url?: string;
  fullPage?: boolean;
  selector?: string;
  viewport?: { width: number; height: number };
  outputPath?: string;
  waitForSelector?: string;
  waitTime?: number;
}

class ScreenshotDebugger {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private screenshotDir: string;

  constructor() {
    // Create screenshots directory if it doesn't exist
    this.screenshotDir = path.join(process.cwd(), 'screenshots');
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    
    // Set default viewport
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    // Enable console logging from the page
    this.page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    this.page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  }

  async captureScreenshot(options: ScreenshotOptions): Promise<string> {
    if (!this.page) {
      await this.initialize();
    }

    const {
      url = 'http://localhost:5173',
      fullPage = true,
      selector,
      viewport,
      outputPath,
      waitForSelector,
      waitTime = 0
    } = options;

    // Navigate to URL if provided
    if (url) {
      await this.page!.goto(url, { waitUntil: 'networkidle2' });
    }

    // Set custom viewport if provided
    if (viewport) {
      await this.page!.setViewport(viewport);
    }

    // Wait for specific selector if provided
    if (waitForSelector) {
      await this.page!.waitForSelector(waitForSelector, { timeout: 10000 });
    }

    // Additional wait time if needed
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = outputPath || `screenshot-${timestamp}.png`;
    const filepath = path.join(this.screenshotDir, filename);

    // Capture screenshot
    if (selector) {
      const element = await this.page!.$(selector);
      if (element) {
        await element.screenshot({ path: filepath as any });
        console.log(`Element screenshot saved: ${filepath}`);
      } else {
        throw new Error(`Selector "${selector}" not found`);
      }
    } else {
      await this.page!.screenshot({ path: filepath as any, fullPage });
      console.log(`Page screenshot saved: ${filepath}`);
    }

    return filepath;
  }

  async captureMultipleViews(baseUrl: string = 'http://localhost:5173'): Promise<void> {
    const views = [
      { name: 'home', path: '/' },
      { name: 'login', path: '/login' },
      { name: 'register', path: '/register' },
      { name: 'student-dashboard', path: '/student' },
      { name: 'teacher-dashboard', path: '/teacher' },
      { name: 'admin-dashboard', path: '/admin' },
      { name: 'lessons', path: '/lessons' },
    ];

    const viewports = [
      { name: 'desktop', width: 1920, height: 1080 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 667 },
    ];

    for (const view of views) {
      for (const viewport of viewports) {
        try {
          await this.captureScreenshot({
            url: `${baseUrl}${view.path}`,
            viewport,
            outputPath: `${view.name}-${viewport.name}.png`,
            waitTime: 1000
          });
        } catch (error) {
          console.error(`Failed to capture ${view.name} on ${viewport.name}:`, error);
        }
      }
    }
  }

  async debugInteractive(url: string = 'http://localhost:5173'): Promise<void> {
    if (!this.page) {
      await this.initialize();
    }

    await this.page!.goto(url, { waitUntil: 'networkidle2' });

    // Get page metrics
    const metrics = await this.page!.metrics();
    console.log('Page metrics:', metrics);

    // Get page title
    const title = await this.page!.title();
    console.log('Page title:', title);

    // Check for common error indicators
    const errors = await this.page!.evaluate(() => {
      const errorElements = document.querySelectorAll('.error, .alert-danger, [class*="error"]');
      return Array.from(errorElements).map(el => ({
        class: el.className,
        text: el.textContent?.trim()
      }));
    });

    if (errors.length > 0) {
      console.log('Found error elements:', errors);
    }

    // Get network errors
    const failedRequests: string[] = [];
    this.page!.on('requestfailed', request => {
      failedRequests.push(`${request.url()} - ${request.failure()?.errorText}`);
    });

    // Capture current state
    await this.captureScreenshot({
      outputPath: 'debug-current-state.png'
    });
  }

  async captureElement(selector: string, url?: string): Promise<string> {
    return this.captureScreenshot({
      url,
      selector,
      fullPage: false,
      outputPath: `element-${selector.replace(/[^a-z0-9]/gi, '-')}.png`
    });
  }

  async fillFormAndCapture(
    url: string,
    formData: Record<string, string>,
    submitSelector: string = 'button[type="submit"]'
  ): Promise<void> {
    if (!this.page) {
      await this.initialize();
    }

    await this.page!.goto(url, { waitUntil: 'networkidle2' });

    // Fill form fields
    for (const [selector, value] of Object.entries(formData)) {
      await this.page!.type(selector, value);
    }

    // Capture before submit
    await this.captureScreenshot({
      outputPath: 'form-filled.png'
    });

    // Submit form
    await this.page!.click(submitSelector);
    await this.page!.waitForNavigation({ waitUntil: 'networkidle2' });

    // Capture after submit
    await this.captureScreenshot({
      outputPath: 'form-submitted.png'
    });
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

// CLI usage
async function main() {
  const screenshotDebugger = new ScreenshotDebugger();
  
  try {
    const args = process.argv.slice(2);
    const command = args[0] || 'capture';

    switch (command) {
      case 'capture':
        const url = args[1] || 'http://localhost:5173';
        const filepath = await screenshotDebugger.captureScreenshot({ url });
        console.log(`Screenshot captured: ${filepath}`);
        break;

      case 'element':
        const selector = args[1];
        const pageUrl = args[2] || 'http://localhost:5173';
        if (!selector) {
          console.error('Please provide a selector');
          process.exit(1);
        }
        await screenshotDebugger.captureElement(selector, pageUrl);
        break;

      case 'multi':
        await screenshotDebugger.captureMultipleViews();
        break;

      case 'debug':
        const debugUrl = args[1] || 'http://localhost:5173';
        await screenshotDebugger.debugInteractive(debugUrl);
        break;

      case 'form':
        // Example: npm run screenshot form http://localhost:5173/login
        const formUrl = args[1] || 'http://localhost:5173/login';
        await screenshotDebugger.fillFormAndCapture(formUrl, {
          'input[name="email"]': 'test@example.com',
          'input[name="password"]': 'password123'
        });
        break;

      default:
        console.log(`
Usage:
  npm run screenshot [command] [options]

Commands:
  capture [url]           - Capture a full page screenshot
  element <selector> [url] - Capture a specific element
  multi                   - Capture multiple views and viewports
  debug [url]            - Run interactive debugging
  form [url]             - Fill and submit a form
        `);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await screenshotDebugger.cleanup();
  }
}

// Export for use in other scripts
export { ScreenshotDebugger, ScreenshotOptions };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}